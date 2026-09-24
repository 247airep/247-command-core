const HEADER_ALIASES = {
  agreementId: ['agreement id','contract id','service agreement id','agreement','contract'],
  accountName: ['account','customer','customer name','company','client'],
  revenue: ['revenue','annual price','agreement revenue','contract value','annual value','price'],
  estimatedCost: ['estimated cost','est cost','budgeted cost','planned cost'],
  actualCost: ['actual cost','cost to date','actual direct cost','direct cost'],
  renewalDate: ['renewal date','expiration date','expiry date','end date'],
  estimatedLaborHours: ['estimated labor hours','est labor hrs','budgeted labor hours','planned labor hours'],
  actualLaborHours: ['actual labor hours','actual labor hrs','labor hours','hours used'],
  visitsIncluded: ['visits included','planned visits','included visits','scheduled visits'],
  visitsUsed: ['visits used','completed visits','actual visits','visits completed'],
  materialCost: ['material cost','materials','actual material cost'],
  scope: ['scope','agreement scope','service scope'],
  status: ['status','agreement status','contract status']
};

const CORE_FIELDS = ['agreementId','revenue','estimatedCost','actualCost','renewalDate'];

function normalizeHeader(value='') {
  return String(value).trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
}

function splitCsvLine(line) {
  const cells=[]; let cur=''; let quoted=false;
  for (let i=0;i<line.length;i++) {
    const ch=line[i];
    if (ch==='"') {
      if (quoted && line[i+1]==='"') { cur+='"'; i++; }
      else quoted=!quoted;
    } else if (ch===',' && !quoted) { cells.push(cur); cur=''; }
    else cur+=ch;
  }
  cells.push(cur);
  return cells;
}

function toNumber(value) {
  if (value == null || String(value).trim()==='') return null;
  const cleaned=String(value).replace(/[$,%\s]/g,'').replace(/\((.*)\)/,'-$1');
  const n=Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toDate(value) {
  if (value == null || String(value).trim()==='') return null;
  const raw=String(value).trim();
  const d=new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : raw;
}

function canonicalMap(headers) {
  const normalized=headers.map(normalizeHeader);
  const map={};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx=normalized.findIndex(h => aliases.includes(h));
    if (idx>=0) map[field]=idx;
  }
  return map;
}

export function ingestCsv(csv, { asOfDate }={}) {
  if (typeof csv !== 'string' || !csv.trim()) throw new Error('CSV input is required');
  const lines=csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length<2) throw new Error('CSV must include a header row and at least one data row');
  const headers=splitCsvLine(lines[0]);
  const map=canonicalMap(headers);
  if (map.agreementId == null) throw new Error('No agreement/contract identifier column found');

  const rows=lines.slice(1).map((line,index)=>{
    const cells=splitCsvLine(line);
    const get=f => map[f] == null ? null : (cells[map[f]] ?? null);
    const row={
      sourceRow:index+2,
      agreementId:get('agreementId')?.trim() || null,
      accountName:get('accountName')?.trim() || null,
      revenue:toNumber(get('revenue')),
      estimatedCost:toNumber(get('estimatedCost')),
      actualCost:toNumber(get('actualCost')),
      renewalDate:toDate(get('renewalDate')),
      estimatedLaborHours:toNumber(get('estimatedLaborHours')),
      actualLaborHours:toNumber(get('actualLaborHours')),
      visitsIncluded:toNumber(get('visitsIncluded')),
      visitsUsed:toNumber(get('visitsUsed')),
      materialCost:toNumber(get('materialCost')),
      scope:get('scope')?.trim() || null,
      status:get('status')?.trim() || null,
      asOfDate:asOfDate || null
    };
    row.missingCoreFields=CORE_FIELDS.filter(f => row[f] == null);
    return row;
  });

  return {
    rows,
    metadata:{
      asOfDate:asOfDate || null,
      inputRows:rows.length,
      mappedFields:Object.keys(map),
      unmappedHeaders:headers.filter((_,i)=>!Object.values(map).includes(i))
    }
  };
}
