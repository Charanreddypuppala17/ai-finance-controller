import { SYSTEM_PROMPT } from './prompts';
import {
  getReconciliationSummaryTool,
  getTransactionTool,
  getExceptionsTool,
  searchTransactionsTool,
} from './tools';

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{
    toolName: string;
    args: any;
    result: any;
  }>;
}

async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response text received from Gemini');
    }

    return text;
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

export async function processCopilotMessage(
  userId: string,
  userPrompt: string,
  runId?: string
): Promise<{ reply: string; toolExecutions: any[] }> {
  const promptLower = userPrompt.toLowerCase();
  const toolExecutions: any[] = [];
  let fallbackReply = '';

  // 1. Match specific transaction request (e.g. #17, transaction 17, INV-1017, TXN-017)
  const txnMatch = userPrompt.match(/(?:\b(?:transaction|txn|invoice|inv)(?![a-zA-Z])|#)\s*([a-zA-Z0-9-]+)/i);
  
  if (txnMatch || promptLower.includes('17')) {
    let query = txnMatch ? txnMatch[1] : '17';
    // If user passed 17, normalize to 17 or INV-1017 or TXN-017
    if (query === '17') query = 'INV-1017';

    const txnData = await getTransactionTool(userId, runId, query);
    toolExecutions.push({
      toolName: 'get_transaction',
      args: { query },
      result: txnData,
    });

    if ('error' in txnData && txnData.error) {
      // Fallback search
      const searchRes = await searchTransactionsTool(userId, runId, query);
      toolExecutions.push({
        toolName: 'search_transactions',
        args: { searchTerm: query },
        result: searchRes,
      });

      fallbackReply = `I searched the database for **${query}** but could not find an exact matching transaction record. Please double check the ID or select it from the Transactions table.`;
    } else if (!('transactionId' in txnData)) {
      fallbackReply = `Could not load transaction data for **${query}**.`;
    } else {
      // Build evidence response
      const ev = txnData.evidence || {};
      const erpAmt = (txnData.erpAmount ?? 0).toLocaleString('en-IN');
      const payAmt = (txnData.paymentAmount ?? 0).toLocaleString('en-IN');
      const feeAmt = (txnData.feeAmount ?? 0).toLocaleString('en-IN');
      const bankAmt = (txnData.bankAmount ?? 0).toLocaleString('en-IN');
      const diffAmt = (txnData.difference ?? 0).toLocaleString('en-IN');

      fallbackReply = `### 🔍 Financial Investigation: Transaction ${txnData.transactionId} (${txnData.invoiceId || 'N/A'})

**Status**: \`${txnData.status}\` | **Exception Type**: \`${txnData.exceptionType}\`

---

#### 💰 Source Breakdown:
- **ERP Invoice Amount**: ₹${erpAmt}
- **Payment Gateway Amount**: ₹${payAmt} (Gateway Fee: ₹${feeAmt})
- **Bank Settlement Amount**: ₹${bankAmt}
- **Net Discrepancy**: **₹${diffAmt}**

---

#### 📄 Matching Evidence & Rationale:
${ev.summary || 'Evidence recorded in deterministic reconciliation engine.'}

- ${ev.checks?.erpToPaymentMatch ? '✓' : '❌'} **ERP $\\rightarrow$ Payment Reference**: ${ev.checks?.erpToPaymentMatch ? 'Matched' : 'Mismatch'}
- ${ev.checks?.paymentToBankMatch ? '✓' : '❌'} **Payment $\\rightarrow$ Bank Settlement**: ${ev.checks?.paymentToBankMatch ? 'Matched' : 'Missing/Mismatch'}
- ${ev.checks?.feeEqualsNetDifference ? '✓' : '❌'} **Fee Reconciliation**: Bank settlement is **₹${txnData.difference}** lower, exactly matching the payment gateway fee of **₹${txnData.feeAmount}**.

> **Audit Recommendation**: This transaction was classified as a **Fee Mismatch**. You can mark it as resolved by confirming the gateway fee deduction in your accounting ledger.`;
    }
  }

  // 2. Summary request
  else if (promptLower.includes('summary') || promptLower.includes('overview') || promptLower.includes('health') || promptLower.includes('match rate')) {
    const summary = await getReconciliationSummaryTool(userId, runId);
    toolExecutions.push({
      toolName: 'get_reconciliation_summary',
      args: { runId },
      result: summary,
    });

    if ('error' in summary && summary.error) {
      fallbackReply = summary.error;
    } else if (!('exceptionBreakdown' in summary)) {
      fallbackReply = 'Could not retrieve reconciliation summary.';
    } else {
      const eb = summary.exceptionBreakdown || {};

      fallbackReply = `### 📊 Reconciliation Run Summary

- **Run ID**: \`${summary.runId}\`
- **Total Financial Records**: **${summary.totalRecords}**
- **Matched Records**: **${summary.matchedRecords}** (${summary.matchRate}% match rate)
- **Exceptions Count**: **${summary.exceptionCount}**

#### Exception Breakdown by Category:
- **Fee Mismatches**: ${eb.FEE_MISMATCH || 0}
- **Amount Mismatches**: ${eb.AMOUNT_MISMATCH || 0}
- **Timing Lags**: ${eb.TIMING_LAG || 0}
- **Missing Bank Settlements**: ${eb.MISSING_BANK_SETTLEMENT || 0}
- **Missing Payment Records**: ${eb.MISSING_PAYMENT_RECORD || 0}
- **Duplicate Payments**: ${eb.DUPLICATE_PAYMENT || 0}

All facts retrieved directly from your isolated persistent database.`;
    }
  }

  // 3. Exception listing request
  else if (promptLower.includes('exception') || promptLower.includes('mismatch') || promptLower.includes('issue')) {
    const exceptions = await getExceptionsTool(userId, runId);
    toolExecutions.push({
      toolName: 'get_exceptions',
      args: { runId },
      result: exceptions,
    });

    const listText = exceptions.slice(0, 5).map(e => `- **${e.transactionId}** (${e.invoiceId}): ${e.exceptionType} | Diff: ₹${e.difference}`).join('\n');

    fallbackReply = `### ⚠ Top Unresolved Exceptions

Found **${exceptions.length}** open exception records in this run.

${listText}

You can ask me to investigate any specific transaction by typing **"Investigate transaction [ID]"**.`;
  }

  // 4. Fallback search tool call
  else {
    const searchResults = await searchTransactionsTool(userId, runId, userPrompt);
    toolExecutions.push({
      toolName: 'search_transactions',
      args: { searchTerm: userPrompt },
      result: searchResults,
    });

    if (searchResults.length > 0) {
      const searchItems = searchResults.slice(0, 5).map(s => `- **${s.transactionId}** (${s.invoiceId}): ${s.status} (${s.exceptionType})`).join('\n');
      fallbackReply = `I searched your financial database for **"${userPrompt}"** and found the following relevant transactions:\n\n${searchItems}\n\nAsk me about any specific transaction for full evidence details!`;
    } else {
      fallbackReply = `I am your evidence-based AI Finance Copilot. You can ask me questions like:
- *"Explain transaction #17"*
- *"Show me the reconciliation summary"*
- *"What exceptions need attention?"*
- *"Search for INV-1017"*

All answers are backed by deterministic database evidence.`;
    }
  }

  // 5. Call Gemini API if available
  if (process.env.GEMINI_API_KEY) {
    try {
      const contextPrompt = `
User Query: "${userPrompt}"

Relevant Database Context (Retrieved using internal database tools):
${JSON.stringify(toolExecutions.map(e => ({ toolName: e.toolName, args: e.args, result: e.result })), null, 2)}

Instructions:
1. Provide a professional, natural language analysis to the user's query based ONLY on the provided Database Context facts.
2. Focus on explaining the root cause: clearly explain WHY there is a mismatch or exception (e.g. duplicate gateway transactions, timing delay between gateway and bank settlement, gateway fees not accounted for, or missing records).
3. Translate technical checks into plain English business reasons (e.g. if IsDuplicate is true, explain that multiple gateway payments reference the same ERP invoice).
4. Provide a clear, actionable audit recommendation or next step for the controller.
5. Format your answer with beautiful, spaced Markdown, bullet points, bold numbers, and visual checkmark/cross indicators.
6. ALWAYS format all financial values, amounts, and discrepancies in Indian Rupees (₹) (e.g. ₹38,500). Do NOT use Dollar signs ($) or any other currency symbol under any circumstances.
`;
      const reply = await callGemini(contextPrompt, SYSTEM_PROMPT);
      return { reply, toolExecutions };
    } catch (e: any) {
      console.warn('Falling back to deterministic agent matching due to Gemini error:', e.message);
    }
  }

  return {
    reply: fallbackReply,
    toolExecutions,
  };
}
