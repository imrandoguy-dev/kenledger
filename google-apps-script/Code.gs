/**
 * Kenledger — Google Sheets backend
 *
 * 1. Change SECRET below to your own phrase (you'll type it into Kenledger).
 * 2. Deploy → New deployment → Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 3. Copy the Web app URL into Kenledger.
 *
 * Tabs (Accounts, Transactions, Categories, Settings) are created automatically.
 * You can read, sort and chart the Transactions tab freely — just don't rename
 * the tabs or the header row, and don't edit the ID columns.
 */

const SECRET = 'change-me-to-something-private';

const TABS = {
  Accounts: ['ID', 'Name', 'Type', 'Starting Balance', 'Currency', 'Icon', 'Color', 'Created At', 'Archived'],
  Transactions: ['ID', 'Date', 'Type', 'Description', 'Amount', 'Signed Amount', 'Account', 'To Account', 'Category', 'Notes', 'Account ID', 'To Account ID', 'Category ID', 'Created At'],
  Categories: ['ID', 'Name', 'Icon', 'Color', 'Type', 'Parent ID'],
  Settings: ['Key', 'Value'],
};

/* ------------------------------------------------------------------ */

function doGet(e) {
  return respond(() => {
    auth((e && e.parameter && e.parameter.token) || '');
    return readAll();
  });
}

function doPost(e) {
  return respond(() => {
    const body = JSON.parse(e.postData.contents || '{}');
    auth(body.token || '');
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      (body.ops || []).forEach(applyOp);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    return { ok: true };
  });
}

function respond(fn) {
  let out;
  try { out = fn(); } catch (err) { out = { ok: false, error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function auth(token) {
  if (SECRET === 'change-me-to-something-private') throw new Error('Set your SECRET in the Apps Script first, then create a new deployment.');
  if (token !== SECRET) throw new Error('Wrong secret phrase.');
}

/* ---------------- Sheet helpers ---------------- */

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function tab(name) {
  const book = ss();
  let sh = book.getSheetByName(name);
  if (!sh) {
    sh = book.insertSheet(name);
    const h = TABS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#174C3B').setFontColor('#F5F2E9');
    sh.setFrozenRows(1);
    // Plain text everywhere so IDs and values aren't auto-converted…
    sh.getRange(2, 1, sh.getMaxRows() - 1, h.length).setNumberFormat('@');
    // …except real dates and money on Transactions, so the sheet is useful for you.
    if (name === 'Transactions') {
      sh.getRange(2, 2, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');
      sh.getRange(2, 5, sh.getMaxRows() - 1, 2).setNumberFormat('#,##0.00');
    }
    if (name === 'Accounts') sh.getRange(2, 4, sh.getMaxRows() - 1, 1).setNumberFormat('#,##0.00');
    const def = book.getSheetByName('Sheet1');
    if (def && def.getLastRow() === 0 && book.getSheets().length > 1) book.deleteSheet(def);
  }
  return sh;
}

function rows(name) {
  const sh = tab(name);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, TABS[name].length).getValues();
}

function findRow(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  const ids = sh.getRange(2, 1, n, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

function upsert(name, row) {
  const sh = tab(name);
  const r = findRow(sh, String(row[0]));
  if (r > 0) sh.getRange(r, 1, 1, row.length).setValues([row]);
  else sh.appendRow(row);
}

function removeWhere(name, pred) {
  const sh = tab(name);
  const data = rows(name);
  for (let i = data.length - 1; i >= 0; i--) if (pred(data[i])) sh.deleteRow(i + 2);
}

function clearTab(name) {
  const sh = tab(name);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, TABS[name].length).clearContent();
}

function writeAll(name, list) {
  clearTab(name);
  if (list.length) tab(name).getRange(2, 1, list.length, TABS[name].length).setValues(list);
}

/* ---------------- Row mapping ---------------- */

const tz = () => ss().getSpreadsheetTimeZone();
const asDate = (v) => (v instanceof Date ? Utilities.formatDate(v, tz(), 'yyyy-MM-dd') : String(v).slice(0, 10));
const asIso = (v) => (v instanceof Date ? v.toISOString() : String(v));
const num = (v) => Number(v) || 0;

function accountRow(a) {
  return [a.id, a.name, a.type, a.startingBalance, a.currency, a.icon, a.color, a.createdAt, a.archived ? 'TRUE' : ''];
}
function txRow(t) {
  const signed = t.type === 'expense' ? -t.amount : t.type === 'income' ? t.amount : 0;
  return [t.id, t.date, t.type, t.description, t.amount, signed, t.accountName || '', t.toAccountName || '', t.type === 'transfer' ? 'Transfer' : (t.categoryName || ''),
    t.notes || '', t.accountId, t.toAccountId || '', t.categoryId || '', t.createdAt];
}
function categoryRow(c) {
  return [c.id, c.name, c.icon, c.color, c.type, c.parentId || ''];
}

function readAll() {
  const accounts = rows('Accounts').filter((r) => r[0]).map((r) => ({
    id: String(r[0]), name: String(r[1]), type: String(r[2]), startingBalance: num(r[3]), currency: String(r[4]),
    icon: String(r[5]), color: String(r[6]), createdAt: asIso(r[7]), archived: String(r[8]).toUpperCase() === 'TRUE' || undefined,
  }));
  const transactions = rows('Transactions').filter((r) => r[0]).map((r) => ({
    id: String(r[0]), date: asDate(r[1]), type: String(r[2]), description: String(r[3]), amount: Math.abs(num(r[4])),
    notes: r[9] ? String(r[9]) : undefined, accountId: String(r[10]), toAccountId: r[11] ? String(r[11]) : undefined,
    categoryId: r[12] ? String(r[12]) : undefined, createdAt: asIso(r[13]),
  }));
  const categories = rows('Categories').filter((r) => r[0]).map((r) => ({
    id: String(r[0]), name: String(r[1]), icon: String(r[2]), color: String(r[3]), type: String(r[4]), parentId: r[5] ? String(r[5]) : undefined, custom: true,
  }));
  const settings = {};
  rows('Settings').forEach((r) => { if (r[0]) { try { settings[r[0]] = JSON.parse(String(r[1])); } catch (e) { settings[r[0]] = r[1]; } } });
  return { ok: true, spreadsheetUrl: ss().getUrl(), spreadsheetName: ss().getName(), accounts, transactions, categories, settings };
}

/* ---------------- Operations ---------------- */

function applyOp(op) {
  switch (op.op) {
    case 'upsertAccount': {
      upsert('Accounts', accountRow(op.data));
      // Keep the human-readable account names on transactions current.
      const sh = tab('Transactions');
      const data = rows('Transactions');
      data.forEach((r, i) => {
        if (String(r[10]) === op.data.id && r[6] !== op.data.name) sh.getRange(i + 2, 7).setValue(op.data.name);
        if (String(r[11]) === op.data.id && r[7] !== op.data.name) sh.getRange(i + 2, 8).setValue(op.data.name);
      });
      break;
    }
    case 'deleteAccount':
      removeWhere('Accounts', (r) => String(r[0]) === op.id);
      removeWhere('Transactions', (r) => String(r[10]) === op.id || String(r[11]) === op.id);
      break;
    case 'upsertTx':
      upsert('Transactions', txRow(op.data));
      break;
    case 'deleteTx':
      removeWhere('Transactions', (r) => String(r[0]) === op.id);
      break;
    case 'upsertCategory':
      upsert('Categories', categoryRow(op.data));
      break;
    case 'deleteCategory': {
      const ids = [op.id];
      rows('Categories').forEach((r) => { if (String(r[5]) === op.id) ids.push(String(r[0])); });
      removeWhere('Categories', (r) => ids.indexOf(String(r[0])) >= 0);
      const sh = tab('Transactions');
      rows('Transactions').forEach((r, i) => {
        if (ids.indexOf(String(r[12])) >= 0) {
          sh.getRange(i + 2, 9).setValue('');
          sh.getRange(i + 2, 13).setValue('');
        }
      });
      break;
    }
    case 'settings': {
      const sh = tab('Settings');
      Object.keys(op.data).forEach((k) => {
        const v = JSON.stringify(op.data[k] === undefined ? null : op.data[k]);
        const r = findRow(sh, k);
        if (r > 0) sh.getRange(r, 2).setValue(v); else sh.appendRow([k, v]);
      });
      break;
    }
    case 'replaceAll': {
      const d = op.data;
      writeAll('Accounts', d.accounts.map(accountRow));
      writeAll('Transactions', d.transactions.map(txRow));
      writeAll('Categories', d.categories.map(categoryRow));
      writeAll('Settings', Object.keys(d.settings).map((k) => [k, JSON.stringify(d.settings[k] === undefined ? null : d.settings[k])]));
      break;
    }
    default:
      throw new Error('Unknown operation: ' + op.op);
  }
}
