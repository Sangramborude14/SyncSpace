import { CanvasElement } from "@a/store/useBoardStore";

export const drawElement = (ctx:CanvasRenderingContext2D, element: CanvasElement) => {

    ctx.strokeStyle = element.color;
    ctx.lineWidth = element.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch(element.type){
        case 'pencil':
            if(!element.points || element.points.length === 0) return;
            ctx.beginPath();
            ctx.moveTo(element.points[0].x,element.points[0].y);
            for(let i=1; i <element.points.length;i++){
                ctx.lineTo(element.points[i].x,element.points[i].y)
            }
            ctx.stroke();
            break;
        
        case 'rectangle':
            if(element.width === undefined || element.height === undefined) return;
            ctx.strokeRect(element.x, element.y, element.width,element.height);
            break;
        
        case 'circle':
            if (element.width === undefined || element.height === undefined)return;
            ctx.beginPath();
            
            const radius = Math.sqrt(element.width** 2 + element.height** 2) / 2;
            const centerX = element.x + element.width / 2;
            const centerY = element.y + element.height / 2;
            ctx.arc(centerX,centerY,radius,0,2 * Math.PI);
            ctx.stroke();
            break;
        
        case 'arrow':
            if(element.width === undefined || element.height === undefined) return;
            ctx.beginPath();
            ctx.moveTo(element.x, element.y);
            const toX = element.x + element.width;
            const toY = element.y + element.height;
            ctx.lineTo(toX,toY);

            //arrowhead
            const angle = Math.atan2(toY - element.y, toX - element.x);
            const headLength = 15;
            ctx.lineTo(
                toX - headLength * Math.cos(angle - Math.PI / 6),
                toY - headLength * Math.sin(angle - Math.PI / 6),
                
            );
            ctx.moveTo(toX,toY);
            ctx.lineTo(
                toX - headLength * Math.cos(angle + Math.PI / 6),
                toY - headLength * Math.sin(angle + Math.PI / 6),
            )
            ctx.stroke();
            break;
        
        case 'text':
            if(!element.text)return;
            ctx.fillStyle  = element.color;
            ctx.font = `${element.strokeWidth*4 + 16}px sans-sarif`;
            ctx.fillText(element.text,element.x,element.y);
            break;
    }

}
