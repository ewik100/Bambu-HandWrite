function refreshFontMetrics(){
 const p=FONT_PROFILES[$('handFont')?.value]||FONT_PROFILES.neucha;
 const fallbackLh=lastModel?.lh??p.lh,fallbackPitch=lastModel?.pitch??p.pitch;
 const lh=readEditableDecimal('lh',2,20,fallbackLh),pitch=readEditableDecimal('pitch',2,30,fallbackPitch);
 if($('fontProfileMetrics'))$('fontProfileMetrics').innerHTML=`<span>Высота / шаг строк: <b>${lh.toFixed(1).replace('.',',')} / ${pitch.toFixed(2).replace('.',',')} мм</b></span><span>Ширина / доп. наклон: <b>${Math.round(p.widthScale*100)}% / ${p.slantDeg}°</b></span><span>Межбуквенное / межсловное: <b>${CANVAS_SPACING.letter?p.letterSpacing.toFixed(2):'0.00'} / ${CANVAS_SPACING.word?p.wordSpacing.toFixed(2):'0.00'} мм</b></span><span>Скорость / детализация: <b>${p.drawFeed} мм/мин / ${p.routeTolerance.toFixed(2)} мм</b></span><span>Соединение: <b>${p.connection}</b></span>`;
 const sample=$('fontSample');
 if(sample){
  const mode=$('scriptMode')?.value||'auto',hand=$('handFont')?.value||'neucha';
  const family=modeFontForScript('cyrl',mode,hand),familyCss=fontCss(family);
  sample.style.fontFamily=familyCss+',cursive';
  sample.style.fontFeatureSettings=$('letterVariety')?.checked?'"calt" 1,"liga" 1,"clig" 1,"dlig" 1,"aalt" 1,"salt" 1':'"calt" 0,"liga" 0,"clig" 0,"dlig" 0,"aalt" 0,"salt" 0';
  sample.style.fontVariantLigatures=$('letterVariety')?.checked?'common-ligatures contextual':'none';
  sample.textContent='Красивый почерк — мама мыла раму. 123';
  sample.style.fontSynthesis='none';
  void sample.offsetWidth;
  if(document.fonts?.load)document.fonts.load('24px '+familyCss,sample.textContent).then(()=>{void sample.offsetWidth}).catch(()=>{});
 }
 const schoolPanel=$('schoolVariationPanel');if(schoolPanel)schoolPanel.hidden=false;
 const lobsterControls=$('lobsterExtras');if(lobsterControls)lobsterControls.style.display='flex';
 updateSchoolFontLoader();
}
