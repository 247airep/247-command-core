const ATTRIBUTION=['OBSERVED_ONLY','CONTRIBUTED','STRONGLY_ATTRIBUTABLE','NOT_ATTRIBUTABLE','UNKNOWN'];

export function createOutcomeRecord({clientId,agreementId,signalId,baseline}) {
  if (!clientId || !agreementId || !signalId) throw new Error('clientId, agreementId, and signalId are required');
  if (!baseline || typeof baseline !== 'object' || Object.keys(baseline).length===0) throw new Error('baseline is required before intervention');
  return {clientId,agreementId,signalId,baseline,status:'OPEN',decision:null,action:null,outcome:null,economicImpact:null,attribution:'UNKNOWN'};
}

export function closeOutcomeRecord(record,{decision,action,outcome,economicImpact=null,attribution='UNKNOWN'}) {
  if (!decision) throw new Error('decision is required');
  if (!ATTRIBUTION.includes(attribution)) throw new Error('invalid attribution');
  return {...record,decision,action:action||null,outcome:outcome||null,economicImpact,attribution,status:'CLOSED'};
}
