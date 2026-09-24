import * as XLSX from 'xlsx';
import { ingestCsv } from './ingest.js';

export function ingestXlsx(buffer,{asOfDate,sheetName}={}) {
  if (!buffer) throw new Error('XLSX input is required');
  const workbook=XLSX.read(buffer,{type:'buffer',cellDates:false});
  const selected=sheetName || workbook.SheetNames[0];
  if (!selected || !workbook.Sheets[selected]) throw new Error('No readable worksheet found');
  const csv=XLSX.utils.sheet_to_csv(workbook.Sheets[selected],{blankrows:false});
  const result=ingestCsv(csv,{asOfDate});
  return {...result,metadata:{...result.metadata,sourceType:'xlsx',sheetName:selected}};
}
