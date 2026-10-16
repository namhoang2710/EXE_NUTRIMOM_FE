interface Box {left:number;top:number;width:number;height:number}
interface Size {width:number;height:number}
/** Prefer a side of the ring; narrow screens use above/below instead of its center. */
export function ringTooltipPosition(chart:Box,tooltip:Size,viewport:Size) {
  const edge=8,gap=12,cx=chart.left+chart.width/2,cy=chart.top+chart.height/2
  const radius=Math.min(chart.width,chart.height)*.47
  const right=cx+radius+gap,left=cx-radius-gap-tooltip.width
  const centeredTop=Math.max(edge,Math.min(cy-tooltip.height/2,viewport.height-tooltip.height-edge))
  if(right+tooltip.width<=viewport.width-edge)return {left:right,top:centeredTop}
  if(left>=edge)return {left,top:centeredTop}
  const above=cy-radius-gap-tooltip.height
  const below=cy+radius+gap
  return {left:Math.max(edge,Math.min(cx-tooltip.width/2,viewport.width-tooltip.width-edge)),
    top:above>=edge?above:below+tooltip.height<=viewport.height-edge?below:above}
}
