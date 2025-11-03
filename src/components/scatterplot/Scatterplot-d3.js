import * as d3 from 'd3'

class ScatterplotD3 {

  margin = {top: 100, right: 10, bottom: 50, left: 100};
  size;
  height;
  width;
  matSvg;
  defaultOpacity=0.3;
  transitionDuration=1000;
  circleRadius = 3;
  xScale;
  yScale;
  brush;
  brushGroup;

  constructor(el){
    this.el=el;
  };

  create = function (config) {
    this.size = {width: config.size.width, height: config.size.height};
    this.width = this.size.width - this.margin.left - this.margin.right;
    this.height = this.size.height - this.margin.top - this.margin.bottom;

    console.log("create SVG width=" + (this.width + this.margin.left + this.margin.right) + " height=" + (this.height+ this.margin.top + this.margin.bottom));

    this.matSvg=d3.select(this.el).append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("class","matSvgG")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.xScale = d3.scaleLinear().range([0,this.width]);
    this.yScale = d3.scaleLinear().range([this.height,0]);

    // Build xAxisG
    this.matSvg.append("g")
      .attr("class","xAxisG")
      .attr("transform","translate(0,"+this.height+")")

    // Add X-axis label
    this.matSvg.append("text")
      .attr("class", "xAxisLabel")
      .attr("text-anchor", "middle")
      .attr("x", this.width / 2)
      .attr("y", this.height + 30)
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#3a475cff");

    // Build yAxisG
    this.matSvg.append("g")
      .attr("class","yAxisG")

    // Add Y-axis label
    this.matSvg.append("text")
      .attr("class", "yAxisLabel")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.height / 2)
      .attr("y", -70)
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "#3a475cff");

    // Create brush group for 2D brush
    this.brushGroup = this.matSvg.append("g")
      .attr("class", "brush");
  }

  changeBorderAndOpacity(selection, selected){
    selection.style("opacity", selected?1:this.defaultOpacity)
    selection.select(".markerCircle")
      .attr("stroke-width",selected?2:0)
  }

  updateMarkers(selection,xAttribute,yAttribute){
    selection
      .transition().duration(this.transitionDuration)
      .attr("transform", (item)=>{
        const xPos = this.xScale(item[xAttribute]);
        const yPos = this.yScale(item[yAttribute]);
        return "translate("+xPos+","+yPos+")";
      })
    this.changeBorderAndOpacity(selection,false)
  }

  highlightSelectedItems(selectedItems){
    this.matSvg.selectAll(".markerG")
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
  }

  updateAxis = function(visData,xAttribute,yAttribute){
    const minXAxis = d3.min(visData.map((item)=>{return item[xAttribute]}));
    const maxXAxis = d3.max(visData.map((item)=>{return item[xAttribute]}));
    const minYAxis = d3.min(visData.map((item)=>{return item[yAttribute]}));
    const maxYAxis = d3.max(visData.map((item)=>{return item[yAttribute]}));

    this.xScale.domain([minXAxis,maxXAxis]);
    this.yScale.domain([minYAxis,maxYAxis]);

    this.matSvg.select(".xAxisG")
      .transition().duration(500)
      .call(d3.axisBottom(this.xScale))

    this.matSvg.select(".yAxisG")
      .transition().duration(500)
      .call(d3.axisLeft(this.yScale))

    // Update X-axis label text
    this.matSvg.select(".xAxisLabel")
      .text(xAttribute.charAt(0).toUpperCase() + xAttribute.slice(1));

    // Update Y-axis label text
    this.matSvg.select(".yAxisLabel")
      .text(yAttribute.charAt(0).toUpperCase() + yAttribute.slice(1));
  }

  renderScatterplot = function (visData, xAttribute, yAttribute, controllerMethods){
    console.log("render scatterplot with a new data list ...")

    this.updateAxis(visData, xAttribute, yAttribute);

    this.matSvg.selectAll(".markerG")
      .data(visData,(itemData)=>itemData.index)
      .join(
        enter=>{
          const itemG=enter.append("g")
            .attr("class","markerG")
            .style("opacity",this.defaultOpacity)
            .on("click", (event,itemData)=>{
              controllerMethods.handleOnClick(itemData);
            })

          itemG.append("circle")
            .attr("class","markerCircle")
            .attr("r",this.circleRadius)
            .attr("stroke","red")

          this.updateMarkers(itemG,xAttribute,yAttribute);
        },
        update=>{
          this.updateMarkers(update,xAttribute,yAttribute)
        },
        exit =>{
          exit.remove()
        }
      )

    // ========== ADD 2D BRUSH TO SCATTERPLOT ==========
    this.brushGroup.selectAll("*").remove();
    
    this.brush = d3.brush()
      .extent([[0, 0], [this.width, this.height]])
      .on("start brush end", (event) => {
        if (event.selection) {
          const [[x0, y0], [x1, y1]] = event.selection;
          
          const xMin = this.xScale.invert(x0);
          const xMax = this.xScale.invert(x1);
          const yMax = this.yScale.invert(y0);
          const yMin = this.yScale.invert(y1);
          
          const selectedData = visData.filter(d => {
            const xVal = d[xAttribute];
            const yVal = d[yAttribute];
            return xVal >= xMin && xVal <= xMax && yVal >= yMin && yVal <= yMax;
          });
          
          if (controllerMethods && controllerMethods.updateSelectedItems) {
            controllerMethods.updateSelectedItems(selectedData);
          }
        } else {
          if (controllerMethods && controllerMethods.updateSelectedItems) {
            controllerMethods.updateSelectedItems([]);
          }
        }
      });
    
    this.brushGroup.call(this.brush);
  }

  clear = function(){
    d3.select(this.el).selectAll("*").remove();
  }
}

export default ScatterplotD3;
