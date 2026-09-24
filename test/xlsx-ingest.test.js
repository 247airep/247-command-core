import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { ingestXlsx } from '../src/index.js';

test('ingests the first worksheet from a real XLSX buffer', () => {
  const rows=[
    ['Contract ID','Customer','Annual Price','Est Cost','Actual Cost','Renewal Date','Est Labor Hrs','Actual Labor Hrs'],
    ['A-300','Demo Mechanical',15000,9500,11200,'2026-11-30',120,155]
  ];
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(rows),'Agreements');
  const buffer=XLSX.write(workbook,{type:'buffer',bookType:'xlsx'});
  const result=ingestXlsx(buffer,{asOfDate:'2026-09-24'});
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].agreementId,'A-300');
  assert.equal(result.rows[0].actualCost,11200);
  assert.equal(result.metadata.sourceType,'xlsx');
  assert.equal(result.metadata.sheetName,'Agreements');
});
