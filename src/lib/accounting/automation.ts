import { createAdminClient } from '@/lib/supabase/server';
import { postJournal } from './journal';

/**
 * On a captured donation, debit the Razorpay settlement bank account
 * and credit Donation Income (general or restricted depending on the
 * campaign).
 */
export async function postDonationJournal(donationId: string) {
  const supabase = createAdminClient();
  const { data: donation } = await supabase
    .from('donations')
    .select('id, amount, currency, donor_name, campaign, receipt_no, payment_id, created_at')
    .eq('id', donationId).maybeSingle();
  if (!donation) return;

  // Avoid duplicate posting
  const { data: existing } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('reference_type', 'donation')
    .eq('reference_id', donationId)
    .maybeSingle();
  if (existing) return;

  const incomeCode = donation.campaign && donation.campaign !== 'general'
    ? '4010'    // Restricted Donation Income
    : '4000';   // General Donation Income

  const memo = `Donation #${donation.receipt_no ?? donationId} — ${donation.donor_name}`;

  await postJournal({
    description: memo,
    reference_type: 'donation',
    reference_id: donationId,
    date: String(donation.created_at).slice(0, 10),
    lines: [
      { account_code: '1110', debit:  Number(donation.amount), memo },  // Bank — Razorpay Settlement
      { account_code: incomeCode, credit: Number(donation.amount), memo },
    ],
  });
}

/**
 * On a captured dues payment, debit bank and credit membership dues.
 */
export async function postDuesPaymentJournal(paymentId: string) {
  const supabase = createAdminClient();
  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, type, dues_id, created_at, receipt_no')
    .eq('id', paymentId).maybeSingle();
  if (!payment || payment.type !== 'dues') return;

  const { data: existing } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('reference_type', 'payment')
    .eq('reference_id', paymentId)
    .maybeSingle();
  if (existing) return;

  await postJournal({
    description: `Dues payment #${payment.receipt_no ?? paymentId}`,
    reference_type: 'payment',
    reference_id: paymentId,
    date: String(payment.created_at).slice(0, 10),
    lines: [
      { account_code: '1110', debit:  Number(payment.amount) },
      { account_code: '4100', credit: Number(payment.amount) },
    ],
  });
}

/**
 * On an approved expense, debit the chosen expense account and credit
 * Accounts Payable. When the expense is later marked paid, we'll
 * post a second journal moving AP to bank.
 */
export async function postExpenseApprovalJournal(expenseId: string) {
  const supabase = createAdminClient();
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, amount, expense_account_id, category, description, expense_date, vendor_id, journal_entry_id')
    .eq('id', expenseId).maybeSingle();
  if (!expense || expense.journal_entry_id) return;
  if (!expense.expense_account_id) throw new Error('Expense missing expense_account_id');

  const memo = expense.description ?? `Expense — ${expense.category ?? 'misc'}`;
  const journal = await postJournal({
    description: memo,
    reference_type: 'expense',
    reference_id: expenseId,
    date: expense.expense_date,
    lines: [
      { account_id: expense.expense_account_id, debit:  Number(expense.amount), memo },
      { account_code: '2000',                   credit: Number(expense.amount), memo }, // AP
    ],
  });

  await supabase.from('expenses')
    .update({ journal_entry_id: journal.id })
    .eq('id', expenseId);
}

/**
 * On an expense marked paid, post a payment journal moving AP → Bank.
 */
export async function postExpensePaymentJournal(expenseId: string) {
  const supabase = createAdminClient();
  const { data: expense } = await supabase
    .from('expenses')
    .select('id, amount, expense_date, vendor_id, paid_at')
    .eq('id', expenseId).maybeSingle();
  if (!expense) return;

  const ref = `expense_payment:${expenseId}`;
  const { data: existing } = await supabase
    .from('journal_entries').select('id')
    .eq('reference_type', 'payment').eq('reference_id', ref).maybeSingle();
  if (existing) return;

  await postJournal({
    description: `Payment for expense ${expenseId}`,
    reference_type: 'payment',
    reference_id: ref,
    date: (expense.paid_at ?? expense.expense_date).slice(0, 10),
    lines: [
      { account_code: '2000', debit:  Number(expense.amount) },   // AP down
      { account_code: '1100', credit: Number(expense.amount) },   // Bank down
    ],
  });
}
