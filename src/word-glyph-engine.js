function schoolVariation(){return 0}
function schoolAccuracy(){return 0}
function schoolRoughness(){return 0}
function schoolNoise(seed,index,salt){
 let h=2166136261;const value=String(seed)+'|'+index+'|'+salt;
 for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
 return (h>>>0)/4294967295;
}
function schoolWordLayout(ctx,word,startX,baseline,fontSize,roughness,letterSpacing,seed,kind='school'){
 const metrics=ctx.measureText(word),dom=typeof document!=='undefined'&&kind!=='print';
 const nativeAlternates=dom&&!!document.getElementById('letterVariety')?.checked;
 const bounceEnabled=dom&&!!document.getElementById('wordBounce')?.checked;
 const bounce=bounceEnabled?(schoolNoise(seed,0,21)-.5)*.70:0;
 return {text:word,x:startX,y:baseline+bounce,metrics,endX:startX+metrics.width+letterSpacing,
  level:0,spans:[],fontSize,seed,different:nativeAlternates,nativeAlternates,styleFactor:1};
}
function drawSchoolWordCanvas(ctx,layout,fontSize){
 ctx.save();
 ctx.globalAlpha=1;
 ctx.globalCompositeOperation='source-over';
 ctx.textBaseline='alphabetic';
 ctx.textAlign='left';
 if('fontKerning' in ctx)ctx.fontKerning='normal';
 if('fontFeatureSettings' in ctx)ctx.fontFeatureSettings=layout.nativeAlternates?'"calt" 1,"liga" 1,"clig" 1':'"calt" 0,"liga" 0,"clig" 0';
 if('lang' in ctx)ctx.lang='ru';
 if('textRendering' in ctx)ctx.textRendering='optimizeLegibility';
 if('fontVariantLigatures' in ctx)ctx.fontVariantLigatures=layout.nativeAlternates?'common-ligatures contextual':'none';
 ctx.fillText(layout.text,layout.x,layout.y);
 ctx.restore();
}
