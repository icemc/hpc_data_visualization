import * as d3 from 'd3'

class ScatterplotD3 {
    margin = {top: 50, right: 50, bottom: 50, left: 60};
    size;
    height;
    width;
    svg;
    xScale;
    yScale;
    brush;
    onBrush;
    defaultOpacity = 0.3;
    transitionDuration = 1000;
    circleRadius = 3;

    constructor(container, onBrush) {
        this.svg = d3.select(container);
        this.onBrush = onBrush;
    }

    initialize(width, height) {
        this.width = width - this.margin.left - this.margin.right;
        this.height = height - this.margin.top - this.margin.bottom;

        // Clear any existing content
        this.svg.selectAll("*").remove();

        // Create the main group element
        const g = this.svg.append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Initialize scales
        this.xScale = d3.scaleLinear()
            .range([0, this.width]);
        
        this.yScale = d3.scaleLinear()
            .range([this.height, 0]);

        // Add axes
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.height})`);

        g.append("g")
            .attr("class", "y-axis");

        // Initialize brush
        this.brush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on("brush", (event) => {
                if (event.selection) {
                    const [[x0, y0], [x1, y1]] = event.selection;
                    const selected = this.getSelectedPoints(x0, y0, x1, y1);
                    this.onBrush(selected);
                }
            })
            .on("end", (event) => {
                if (!event.selection) {
                    // If the brush was cleared, reset the selection
                    this.onBrush([]);
                }
            });

        // Add brush group
        g.append("g")
            .attr("class", "brush")
            .call(this.brush);

        // Add clip path
        this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", this.width)
            .attr("height", this.height);
    }

    update(data, xAttr = 'area', yAttr = 'price') {
        // Update scales
        this.xScale.domain(d3.extent(data, d => +d[xAttr]));
        this.yScale.domain(d3.extent(data, d => +d[yAttr]));

        // Update axes
        const xAxis = d3.axisBottom(this.xScale);
        const yAxis = d3.axisLeft(this.yScale);

        this.svg.select(".x-axis")
            .transition()
            .duration(750)
            .call(xAxis);

        this.svg.select(".y-axis")
            .transition()
            .duration(750)
            .call(yAxis);

        // Add axis labels
        this.svg.select(".x-label").remove();
        this.svg.select(".y-label").remove();

        this.svg.append("text")
            .attr("class", "x-label")
            .attr("text-anchor", "middle")
            .attr("x", this.margin.left + this.width / 2)
            .attr("y", this.height + this.margin.top + 40)
            .text(xAttr);

        this.svg.append("text")
            .attr("class", "y-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -(this.margin.top + this.height / 2))
            .attr("y", 20)
            .text(yAttr);

        // Data join for points
        const points = this.svg.select("g").selectAll(".point")
            .data(data);

        // Enter
        points.enter()
            .append("circle")
            .attr("class", "point")
            .attr("r", 5)
            .merge(points)
            .attr("cx", d => this.xScale(+d[xAttr]))
            .attr("cy", d => this.yScale(+d[yAttr]))
            .attr("fill", "steelblue")
            .attr("opacity", 0.6);

        // Exit
        points.exit().remove();
    }

    getSelectedPoints(x0, y0, x1, y1) {
        const selected = [];
        this.svg.selectAll(".point").each((d, i, nodes) => {
            const point = nodes[i];
            const cx = +point.getAttribute("cx");
            const cy = +point.getAttribute("cy");
            if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
                selected.push(d);
            }
        });
        return selected;
    }

    highlightPoints(selectedIds) {
        this.svg.selectAll(".point")
            .attr("fill", d => selectedIds.includes(d.id) ? "red" : "steelblue")
            .attr("opacity", d => selectedIds.includes(d.id) ? 0.8 : 0.6)
            .attr("r", d => selectedIds.includes(d.id) ? 7 : 5);
    }
    changeBorderAndOpacity(selection, selected) {
        selection.style("opacity", selected ? 1 : this.defaultOpacity);
        selection.select(".markerCircle")
            .attr("stroke-width", selected ? 2 : 0);
    }

    updateMarkers(selection, xAttribute, yAttribute) {
        // transform selection
        selection
            .transition().duration(this.transitionDuration)
            .attr("transform", (item)=>{
                // use scales to return shape position from data values
                const xPos = this.xScale(item[xAttribute]);
                const yPos = this.yScale(item[yAttribute]);
                return "translate("+xPos+","+yPos+")";
            })
        ;
        this.changeBorderAndOpacity(selection,false)
    }

    highlightSelectedItems(selectedItems){
        // use pattern update to change the border and opacity of the markers:
        //      - call this.changeBorderAndOpacity(selection,true) for markers that match selectedItems
        //      - this.changeBorderAndOpacity(selection,false) for markers the do not match selectedItems
        this.matSvg.selectAll(".markerG")
            // all elements with the class .markerG (empty the first time)
            .data(selectedItems,(itemData)=>itemData.index)
            .join(
                enter=>enter,
                update=>{
                    this.changeBorderAndOpacity(update, true);
                },
                exit => {
                    this.changeBorderAndOpacity(exit, false);
                }
            )
        ;
    }

    updateAxis = function(visData,xAttribute,yAttribute){
        // compute min max using d3.min/max(visData.map(item=>item.attribute))
        const minXAxis = d3.min(visData.map((item)=>{return item[xAttribute]}));
        const maxXAxis = d3.max(visData.map((item)=>{return item[xAttribute]}));
        const minYAxis = d3.min(visData.map((item)=>{return item[yAttribute]}));
        const maxYAxis = d3.max(visData.map((item)=>{return item[yAttribute]}));

        this.xScale.domain([minXAxis,maxXAxis]);
        this.yScale.domain([minYAxis,maxYAxis]);

        // create axis with computed scales
        this.matSvg.select(".xAxisG")
            .transition().duration(500)
            .call(d3.axisBottom(this.xScale))
        ;
        this.matSvg.select(".yAxisG")
            .transition().duration(500)
            .call(d3.axisLeft(this.yScale))
    }


    renderScatterplot = function (visData, xAttribute, yAttribute, controllerMethods){
        console.log("render scatterplot with a new data list ...")
        // build the size scales and x,y axis
        this.updateAxis(visData, xAttribute, yAttribute);

        this.matSvg.selectAll(".markerG")
            // all elements with the class .markerG (empty the first time)
            .data(visData,(itemData)=>itemData.index)
            .join(
                enter=>{
                    // all data items to add:
                    // doesn’exist in the select but exist in the new array
                    const itemG=enter.append("g")
                        .attr("class","markerG")
                        .style("opacity",this.defaultOpacity)
                        .on("click", (event,itemData)=>{
                            controllerMethods.handleOnClick(itemData);
                        })
                    ;
                    // render element as child of each element "g"
                    itemG.append("circle")
                        .attr("class","markerCircle")
                        .attr("r",this.circleRadius)
                        .attr("stroke","red")
                    ;
                    this.updateMarkers(itemG,xAttribute,yAttribute);
                },
                update=>{
                    this.updateMarkers(update,xAttribute,yAttribute)
                },
                exit =>{
                    exit.remove()
                    ;
                }

            )
    }

    clear = function(){
        d3.select(this.el).selectAll("*").remove();
    }
}
export default ScatterplotD3;