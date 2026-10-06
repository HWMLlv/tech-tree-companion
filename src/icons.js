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
 check:{label:'完成',body:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>'},
 ore:{"label":"矿石","body":"<path d=\"m3 15 4-9 7-3 7 8-2 8-12 2Z M7 6l3 6-3 9 M10 12l11-1 M10 12l5 8\"/><path d=\"m14 7 2 1m-2 7 2 1\"/>"},
 rock:{"label":"岩石","body":"<path d=\"m3 16 3-8 7-4 7 5 2 8-5 4H7Z M6 8l6 5 8-4 M12 13l-2 8\"/>"},
 crystal:{"label":"晶体","body":"<path d=\"m10 2 6 4v14l-6 2-4-4V7Z M10 2v20 M6 7l4 3 6-4 M6 11l-3 3v6l3 2 M16 11l5-4v11l-5 2\"/>"},
 ingot:{"label":"金属锭","body":"<path d=\"M6 6h12l4 11H2Z M2 17v4h20v-4 M6 6l-4 11 M18 6l4 11 M6 6l3 11\"/>"},
 powder:{"label":"粉末","body":"<path d=\"m3 20 5-7 4 3 3-7 6 11Z\"/><circle cx=\"5\" cy=\"7\" r=\".7\"/><circle cx=\"11\" cy=\"5\" r=\".7\"/><circle cx=\"19\" cy=\"7\" r=\".7\"/><path d=\"m9 19 1-1m5 1 1-1\"/>"},
 gravel:{"label":"砂砾","body":"<path d=\"m3 20 3-4 3 1 2-5 4-1 3 5 3 4Z M11 12l3 5 M6 16l2 4\"/><path d=\"m5 8 2-1 1 2-2 1Z m12-3 2-1 1 2-2 1Z\"/>"},
 wood:{"label":"木材","body":"<ellipse cx=\"7\" cy=\"12\" rx=\"5\" ry=\"8\"/><ellipse cx=\"7\" cy=\"12\" rx=\"2\" ry=\"4\"/><path d=\"M7 4h10c7 0 7 16 0 16H7 M13 8h5m-5 8h5\"/>"},
 gas:{"label":"气体","body":"<path d=\"M3 7h11c5 0 5-6 1-5 M3 12h15c5 0 5 6 1 6 M3 17h7c5 0 5 6 1 5\"/>"},
 pickaxe:{"label":"矿镐","body":"<path d=\"m3 5 2-2c7-1 12 3 15 8l-3 2C13 8 8 5 3 5Z M10 7l2 2-8 12-2-2Z\"/>"},
 furnace:{"label":"熔炉","body":"<path d=\"M4 3h16v18H4Z M4 7h16 M7 3v4m10-4v4\"/><path d=\"M12 10c-1 3-4 4-4 7a4 4 0 0 0 8 0c0-2-1-3-2-4l-1 3Z\"/>"},
 pump:{"label":"水泵","body":"<circle cx=\"14\" cy=\"13\" r=\"5\"/><path d=\"M2 11h7m-7 4h7 M17 9V4h5 M11 18v3h9 M12 10l4 6m-1-6-3 6\"/><path d=\"M2 9v8m18-15h3\"/>"},
 pipe:{"label":"管道","body":"<path d=\"M3 5h12a5 5 0 0 1 5 5v11h-6V11H3Z M2 3v10 M12 20h10 M8 5v6\"/>"},
 motor:{"label":"电机","body":"<rect x=\"6\" y=\"6\" width=\"14\" height=\"13\" rx=\"3\"/><path d=\"M2 11h4m-4 4h4 M10 6V3m5 3V3 M9 19v3h10 M11 10v5m4-5v5\"/>"},
 chip:{"label":"芯片","body":"<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\" rx=\"1\"/><path d=\"M9 2v4m6-4v4 M9 18v4m6-4v4 M2 9h4m-4 6h4 M18 9h4m-4 6h4\"/>"},
 recycle:{"label":"回收","body":"<path d=\"m7 8 4-6 5 8 M12 9l4 1 1-4 M18 11l4 7h-9 M15 15l-2 3 2 3 M10 18H2l4-7 M3 11h3l2 3\"/>"},
 conveyor:{"label":"传送带","body":"<rect x=\"2\" y=\"12\" width=\"20\" height=\"7\" rx=\"3.5\"/><circle cx=\"6\" cy=\"15.5\" r=\"1.2\"/><circle cx=\"12\" cy=\"15.5\" r=\"1.2\"/><circle cx=\"18\" cy=\"15.5\" r=\"1.2\"/><rect x=\"7\" y=\"4\" width=\"9\" height=\"8\" rx=\"1\"/><path d=\"M5 19v3m14-3v3 M11.5 4v3\"/>"},
 warehouse:{"label":"仓储","body":"<path d=\"m2 9 10-7 10 7v12H2Z M7 21v-9h10v9 M7 15h10m-10 3h10 M2 9h20\"/>"},
 truck:{"label":"运输","body":"<path d=\"M2 5h12v12H2Z M14 10h5l3 4v3h-3 M14 17h-4 M18 10v4h4\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"18\" r=\"3\"/>"},
 temperature:{"label":"温度","body":"<path d=\"M9 15V5a3 3 0 0 1 6 0v10a5 5 0 1 1-6 0Z M12 7v10 M18 6h3m-3 4h2\"/><circle cx=\"12\" cy=\"18\" r=\"1.5\" fill=\"currentColor\"/>"},
 pressure:{"label":"压力","body":"<circle cx=\"12\" cy=\"11\" r=\"9\"/><path d=\"M7 21h10 M12 4v2 M5 10h2m10 0h2 M12 11l4-4\"/><circle cx=\"12\" cy=\"11\" r=\"1.2\" fill=\"currentColor\"/>"}
};
export const ICON_GROUPS=[{"label":"常用图标","keys":["atom","flask","bolt","gear","leaf","drop","factory","cube","star","check"]},{"label":"资源与材料","keys":["ore","rock","crystal","ingot","powder","gravel","wood","gas"]},{"label":"生产设备","keys":["pickaxe","furnace","pump","pipe","motor","chip"]},{"label":"工艺与物流","keys":["recycle","conveyor","warehouse","truck","temperature","pressure"]}];
export const iconBody=key=>ICONS[key]?.body??'';
export const iconSVG=key=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+iconBody(key)+'</svg>';
