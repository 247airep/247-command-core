function daysBetween(a,b) {
  if (!a || !b) return null;
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`))/86400000);
}

function priorityFor(score) {
  return score >= 75 ? 'PRIORITY' : score >= 50 ? 'REVIEW' : 'WATCH';
}

function signal({agreementId,type,title,score,confidence,evidence,unknowns=[],recommendedInvestigation,potentialExposure=null}) {
  return {
    id:`${agreementId}:${type}`,
    agreementId,type,title,score:Math.max(0,Math.min(100,Math.round(score))),
    priority:priorityFor(score),confidence,evidence,unknowns,recommendedInvestigation,
    potentialExposure,
    impactLabel: potentialExposure == null ? null : 'potential exposure',
    attribution:'UNPROVEN'
  };
}

export function analyzeAgreements(rows,{asOfDate}={}) {
  return rows.map(row=>{
    const signals=[];
    const unknowns=[];

    if (row.missingCoreFields?.length) {
      signals.push(signal({
        agreementId:row.agreementId,type:'DATA_GAP',title:'Core agreement data is incomplete',score:55,
        confidence:'HIGH',evidence:[`Missing: ${row.missingCoreFields.join(', ')}`],
        unknowns:row.missingCoreFields,
        recommendedInvestigation:'Request only the missing fields required to evaluate profitability and renewal exposure.'
      }));
    }

    if (row.estimatedLaborHours != null && row.actualLaborHours != null && row.estimatedLaborHours > 0) {
      const variance=(row.actualLaborHours-row.estimatedLaborHours)/row.estimatedLaborHours;
      if (variance >= 0.10) {
        const score=variance >= .30 ? 84 : variance >= .20 ? 72 : 58;
        signals.push(signal({
          agreementId:row.agreementId,type:'LABOR_OVERRUN',title:'Labor usage is above agreement assumptions',score,
          confidence:'HIGH',evidence:[`Actual labor is ${(variance*100).toFixed(1)}% above estimated hours (${row.actualLaborHours} vs ${row.estimatedLaborHours}).`],
          recommendedInvestigation:'Compare labor consumed against scope, visit history, callbacks, and renewal pricing before committing to the next term.'
        }));
      }
    } else unknowns.push('labor variance');

    if (row.estimatedCost != null && row.actualCost != null && row.estimatedCost > 0) {
      const variance=(row.actualCost-row.estimatedCost)/row.estimatedCost;
      if (variance >= 0.08) {
        const exposure=Math.max(0,row.actualCost-row.estimatedCost);
        const score=variance >= .25 ? 82 : variance >= .15 ? 70 : 56;
        signals.push(signal({
          agreementId:row.agreementId,type:'COST_OVERRUN',title:'Actual direct cost is above estimate',score,
          confidence:'HIGH',evidence:[`Actual cost is ${(variance*100).toFixed(1)}% above estimated cost ($${row.actualCost.toLocaleString()} vs $${row.estimatedCost.toLocaleString()}).`],
          recommendedInvestigation:'Review which cost category created the variance and whether scope, price, or service execution needs correction.',
          potentialExposure:exposure
        }));
      }
    } else unknowns.push('cost variance');

    if (row.revenue != null && row.actualCost != null && row.revenue > 0) {
      const margin=(row.revenue-row.actualCost)/row.revenue;
      if (margin < .20) {
        const score=margin < .05 ? 86 : margin < .12 ? 76 : 62;
        signals.push(signal({
          agreementId:row.agreementId,type:'MARGIN_PRESSURE',title:'Agreement margin warrants management review',score,
          confidence:'HIGH',evidence:[`Observed margin from submitted revenue and direct cost is ${(margin*100).toFixed(1)}%.`],
          recommendedInvestigation:'Validate cost completeness and determine whether pricing, scope, labor usage, or account strategy should change before renewal.'
        }));
      }
    } else unknowns.push('observed margin');

    const daysToRenewal=daysBetween(asOfDate,row.renewalDate);
    if (daysToRenewal != null && daysToRenewal >= 0 && daysToRenewal <= 90) {
      const score=daysToRenewal <= 30 ? 78 : daysToRenewal <= 60 ? 66 : 54;
      signals.push(signal({
        agreementId:row.agreementId,type:'RENEWAL_WINDOW',title:'Renewal decision window is approaching',score,
        confidence:'HIGH',evidence:[`${daysToRenewal} days remain until the submitted renewal date (${row.renewalDate}).`],
        recommendedInvestigation:'Review profitability, service history, scope fit, and customer context before renewal terms are finalized.'
      }));
    }

    if (row.visitsIncluded != null && row.visitsUsed != null && row.visitsIncluded > 0) {
      const ratio=row.visitsUsed/row.visitsIncluded;
      if (ratio > 1) signals.push(signal({
        agreementId:row.agreementId,type:'VISIT_OVERRUN',title:'Completed visits exceed included visits',score:68,
        confidence:'HIGH',evidence:[`${row.visitsUsed} visits recorded against ${row.visitsIncluded} included visits.`],
        recommendedInvestigation:'Verify whether extra visits were billable, callback-related, or evidence that agreement scope/pricing needs revision.'
      }));
    }

    signals.sort((a,b)=>b.score-a.score);
    return {agreementId:row.agreementId,accountName:row.accountName,signals,unknowns};
  });
}
