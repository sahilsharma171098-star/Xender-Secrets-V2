// Prepare a private cross-post batch. Publishing and provider receipts stay with the authorized publisher.
export function captionFor({title,description,channel_url}) {
  if(!/^https:\/\/www\.youtube\.com\/channel\/UC[A-Za-z0-9_-]{22}$/.test(channel_url||''))throw Error('Verified canonical YouTube channel URL required');
  if(!title?.trim()||!description?.trim())throw Error('Original title and complete description required');
  const caption=title.trim()+'\n\n'+description.trim()+'\n\nYouTube channel: '+channel_url;
  if([...caption].length>2200)throw Error('Caption exceeds 2200 characters; review an adaptation without dropping credits/disclaimers');
  return caption;
}
export function crosspostPlan({videos,account,channel_url,existing=[]}) {
  if(!account?.trim()||!Array.isArray(videos))throw Error('Verified destination and videos required');
  const seen=new Set(),posted=new Map(existing.map(x=>[x.source_video_id,x]));
  return videos.map(v=>{
    if(!/^[A-Za-z0-9_-]{11}$/.test(v.id||'')||seen.has(v.id))throw Error('Invalid or duplicate source video ID');seen.add(v.id);
    const row={key:'instagram:'+account+':youtube:'+v.id,source_video_id:v.id,title:v.title,channel_url,account,status:'needs_source_file',caption:null,asset:v.asset??null,provider_id:null,provider_url:null};
    if(v.visibility!=='public')return {...row,status:'excluded_nonpublic'};
    if(posted.has(v.id))return {...row,status:'existing_link_needs_reconciliation',existing_evidence:posted.get(v.id)};
    if(v.seconds>900)return {...row,status:'needs_reviewed_parts'};
    try{row.caption=captionFor({...v,channel_url});}catch(e){return {...row,status:'needs_caption_review',blocker:e.message};}
    if(v.asset){if(!/^https:\/\//.test(v.asset.url||'')||!/^[a-f0-9]{64}$/.test(v.asset.sha256||''))throw Error('Verified HTTPS asset and SHA-256 required');row.status='ready_for_authorized_publisher';}
    return row;
  });
}
