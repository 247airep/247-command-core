const ORDER={PRIORITY:0,REVIEW:1,WATCH:2};

export function buildPriorityReview(reviews,{companyName='Client',asOfDate=null}={}) {
  const items=reviews.flatMap(r => r.signals.map(s=>({...s,accountName:r.accountName})))
    .sort((a,b)=>ORDER[a.priority]-ORDER[b.priority] || b.score-a.score);
  return {
    version:'1.0',
    companyName,
    asOfDate,
    summary:{
      agreementsReviewed:reviews.length,
      signals:items.length,
      priority:items.filter(i=>i.priority==='PRIORITY').length,
      review:items.filter(i=>i.priority==='REVIEW').length,
      watch:items.filter(i=>i.priority==='WATCH').length
    },
    items,
    disclaimer:'Potential exposure is an observed variance or review estimate from submitted data. It is not realized savings, guaranteed recovery, or a 24/7 AI Rep outcome. Management must validate evidence and decide what action, if any, to take.'
  };
}
