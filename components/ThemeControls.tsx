'use client';
import { useEffect, useState } from 'react';

type Theme='light'|'dark'|'contrast';

export default function ThemeControls(){
  const[theme,setTheme]=useState<Theme>('light');
  useEffect(()=>{try{const saved=localStorage.getItem('openfunding-theme') as Theme|null;if(saved&&['light','dark','contrast'].includes(saved)){setTheme(saved);document.documentElement.dataset.theme=saved}}catch{}},[]);
  function change(value:Theme){setTheme(value);document.documentElement.dataset.theme=value;try{localStorage.setItem('openfunding-theme',value)}catch{}}
  return <label className="themeControl"><span className="srOnly">Color mode</span><select aria-label="Color mode" value={theme} onChange={e=>change(e.target.value as Theme)}><option value="light">Light</option><option value="dark">Dark</option><option value="contrast">High contrast</option></select></label>
}
