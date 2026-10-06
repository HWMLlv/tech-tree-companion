// Original, small path-only icons. No remote references or arbitrary SVG markup.
export const TECH_ICON='tech-tree-companion-mark';
export const TECH_MARK='<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="36" width="28" height="28" rx="7"/><path d="M37 50h18V21h12M55 50v29h12"/><rect x="67" y="9" width="24" height="24" rx="5"/><rect x="67" y="67" width="24" height="24" rx="5"/><path d="m18 49 5-6 5 6-5 8Z"/></g>';
export const ICONS={
 atom:{label:'原子',body:'<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'},
 flask:{label:'烧瓶',body:'<path d="M9 3h6M10 3v6L4 19q-1 2 2 2h12q3 0 2-2L14 9V3M7 15h10"/>'},
 bolt:{label:'闪电',body:'<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>'},
 gear:{label:'齿轮',body:'<path d="m9 3 1-1h4l1 3 3 1 3 1 1 4-2 2-1 3v3l-4 2-3-1-3-1-3 1-3-3 1-3 1-3-1-3 3-3 3 1Z"/><circle cx="12" cy="12" r="3"/>'},
 leaf:{label:'叶片',body:'<path d="M20 3C7 2 2 8 5 16c8 5 16-1 15-13ZM3 21 16 8"/>'},
 drop:{label:'水滴',body:'<path d="M12 2C9 7 5 10 5 15a7 7 0 0 0 14 0c0-5-4-8-7-13ZM8 15q0 4 4 4"/>'},
 factory:{label:'工厂',body:'<path d="M3 21V11l6-4v4l6-4v14ZM15 21h6V3h-4v10M6 15h1m4 0h1m-6 3h1m4 0h1"/>'},
 cube:{label:'立方体',body:'<path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10"/>'},
 star:{label:'星标',body:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z"/>'},
 check:{label:'完成',body:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>'}
};
export const iconBody=key=>ICONS[key]?.body??'';
export const iconSVG=key=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+iconBody(key)+'</svg>';
