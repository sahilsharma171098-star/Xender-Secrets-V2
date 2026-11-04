// SiteCheck Pro export. CSV data stays local to the browser.
// Prevent CSV spreadsheet formula injection by prefixing user-controlled cells.
const safeCell=(value)=>{
  let text=String(value??"").replace(/\u0000/g,"");
  if(/^[\s]*[=+\-@\t\r]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
};
const row=cells=>cells.map(safeCell).join(",");
export function prioritizedCsv(result,scored,now=new Date()){
  if(!result||!scored)throw new Error("No audit to export");
  const host=String(result.url||"");
  const rows=[
    ["Website QA report",host,"Checked",now.toISOString()],
    ["Heuristic score",scored.overall??"N/A","Band",scored.band?.label||"N/A"],
    ["Priority","Area","Issue","Instances","Evidence / details","Recommended fix"],
  ];
  const labels={critical:"1 - Critical",warning:"2 - Warning",recommendation:"3 - Recommendation"};
  for(const severity of ["critical","warning","recommendation"]){
    for(const issue of scored.issues.filter(x=>x.severity===severity)){
      rows.push([labels[severity],issue.category||"",issue.title||"",issue.count||1,issue.detail||"",issue.fix||""]);
    }
  }
  if(rows.length===3)rows.push(["No issues","", "No detected issues","","",""]);
  rows.push(["","","","","",""]);
  rows.push(["Note","Heuristic evaluation; not a Lighthouse or full WCAG audit","","","",""]);
  return "\uFEFF"+rows.map(row).join("\r\n")+"\r\n";
}
