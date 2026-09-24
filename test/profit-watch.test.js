import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestCsv, analyzeAgreements, buildPriorityReview, createOutcomeRecord, closeOutcomeRecord } from '../src/index.js';

test('maps common contractor headers into canonical agreement fields', () => {
  const csv = `Contract ID,Customer,Annual Price,Est Cost,Actual Cost,Renewal Date,Est Labor Hrs,Actual Labor Hrs,Visits Included,Visits Used\nA-100,Acme,$12000,$8000,$9800,2026-11-15,100,140,4,4`;
  const result = ingestCsv(csv, { asOfDate: '2026-09-24' });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].agreementId, 'A-100');
  assert.equal(result.rows[0].revenue, 12000);
  assert.equal(result.rows[0].actualCost, 9800);
  assert.equal(result.rows[0].actualLaborHours, 140);
});

test('reports missing core fields instead of inventing values', () => {
  const result = ingestCsv(`Agreement ID,Revenue\nA-101,5000`, { asOfDate: '2026-09-24' });
  assert.deepEqual(result.rows[0].missingCoreFields.sort(), ['actualCost','estimatedCost','renewalDate']);
  assert.equal(result.rows[0].actualCost, null);
});

test('raises a priority labor overrun signal when actual hours materially exceed estimate', () => {
  const [review] = analyzeAgreements([{agreementId:'A-200',accountName:'Demo',revenue:12000,estimatedCost:8000,actualCost:9800,renewalDate:'2026-11-15',estimatedLaborHours:100,actualLaborHours:140,visitsIncluded:4,visitsUsed:4,missingCoreFields:[]}], { asOfDate:'2026-09-24' });
  const signal = review.signals.find(s => s.type === 'LABOR_OVERRUN');
  assert.ok(signal);
  assert.equal(signal.priority, 'PRIORITY');
  assert.equal(signal.confidence, 'HIGH');
  assert.match(signal.evidence.join(' '), /40.0%/);
});

test('never labels unmeasured dollar impact as savings', () => {
  const [review] = analyzeAgreements([{agreementId:'A-201',accountName:'Demo',revenue:10000,estimatedCost:7000,actualCost:9000,renewalDate:'2026-10-15',estimatedLaborHours:null,actualLaborHours:null,visitsIncluded:null,visitsUsed:null,missingCoreFields:[]}], { asOfDate:'2026-09-24' });
  assert.ok(review.signals.length > 0);
  assert.ok(review.signals.every(s => !/savings/i.test(JSON.stringify(s))));
});

test('creates data-gap signal when required information is absent', () => {
  const [review] = analyzeAgreements([{agreementId:'A-202',accountName:'Demo',revenue:5000,estimatedCost:null,actualCost:null,renewalDate:null,missingCoreFields:['estimatedCost','actualCost','renewalDate']}], { asOfDate:'2026-09-24' });
  const signal = review.signals.find(s => s.type === 'DATA_GAP');
  assert.ok(signal);
  assert.equal(signal.priority, 'REVIEW');
});

test('builds management review grouped into PRIORITY REVIEW WATCH', () => {
  const reviews=[{agreementId:'A',accountName:'A Co',signals:[
    {type:'X',priority:'WATCH',score:32,confidence:'MEDIUM',title:'Watch',evidence:['e'],unknowns:[],recommendedInvestigation:'x'},
    {type:'Y',priority:'PRIORITY',score:91,confidence:'HIGH',title:'Priority',evidence:['e'],unknowns:[],recommendedInvestigation:'y'},
    {type:'Z',priority:'REVIEW',score:61,confidence:'HIGH',title:'Review',evidence:['e'],unknowns:[],recommendedInvestigation:'z'}
  ]}];
  const out=buildPriorityReview(reviews,{companyName:'Demo Contractor',asOfDate:'2026-09-24'});
  assert.equal(out.summary.priority,1);
  assert.equal(out.summary.review,1);
  assert.equal(out.summary.watch,1);
  assert.equal(out.items[0].priority,'PRIORITY');
  assert.equal(out.disclaimer.includes('not realized savings'),true);
});

test('requires baseline and preserves attribution discipline', () => {
  const rec=createOutcomeRecord({clientId:'C1',agreementId:'A1',signalId:'S1',baseline:{marginPct:0.15}});
  const closed=closeOutcomeRecord(rec,{decision:'REPRICE',action:'Adjusted renewal pricing',outcome:{marginPct:0.19},economicImpact:4000,attribution:'CONTRIBUTED'});
  assert.equal(closed.baseline.marginPct,0.15);
  assert.equal(closed.outcome.marginPct,0.19);
  assert.equal(closed.attribution,'CONTRIBUTED');
  assert.equal(closed.status,'CLOSED');
});
