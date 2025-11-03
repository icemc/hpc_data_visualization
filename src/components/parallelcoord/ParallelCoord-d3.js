import * as d3 from 'd3';

class ParallelCoord {
    constructor(container, data, dimensions) {
        this.container = container;
        this.data = data;
        this.dimensions = dimensions;
        this.margin = { top: 30, right: 50, bottom: 30, left: 50 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;
        // color scheme
        this.defaultColor = '#666';
        this.selectedColor = 'red';
        this.hoverColor = '#1f77b4';
        this.selectedIds = new Set();
        this.selectedStrokeWidth = 2;
        
        this.init();
    }

    init() {
        const { width, height, margin } = this;

        // ensure container can position absolute tooltip
        d3.select(this.container).style('position', 'relative');

        // create tooltip element (hidden initially)
        this.tooltip = d3.select(this.container)
            .append('div')
            .attr('class', 'pc-tooltip')
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('background', 'white')
            .style('border', '1px solid #ddd')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('box-shadow', '0 2px 6px rgba(0,0,0,0.15)')
            .style('display', 'none');

        // Create SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create scales for each dimension
        this.y = {};
        this.dimensions.forEach(dim => {
            if (typeof this.data[0][dim] === 'number') {
                this.y[dim] = d3.scaleLinear()
                    .domain(d3.extent(this.data, d => d[dim]))
                    .range([height, 0]);
            } else {
                const values = Array.from(new Set(this.data.map(d => d[dim])));
                this.y[dim] = d3.scalePoint()
                    .domain(values)
                    .range([height, 0]);
            }
        });

        // Create x scale for dimensions
        this.x = d3.scalePoint()
            .range([0, width])
            .domain(this.dimensions);

        // Add axes (with fewer ticks: halve the default number of tick marks)
        const baseTickEstimate = Math.max(2, Math.round(height / 50));
        const halfTickCount = Math.max(2, Math.round(baseTickEstimate / 2));

        this.axes = this.svg.selectAll('.axis')
            .data(this.dimensions)
            .enter()
            .append('g')
            .attr('class', 'axis')
            .attr('transform', d => `translate(${this.x(d)},0)`)
            .each((dim, i, nodes) => {
                const scale = this.y[dim];
                let axisGen;

                // Special-case: for the 'area' axis use fixed 2000 intervals
                if (dim === 'area' && scale && scale.domain) {
                    const domain = scale.domain();
                    const min = Math.floor(domain[0] / 2000) * 2000;
                    const max = Math.ceil(domain[1] / 2000) * 2000;
                    // build tick values from min to max in steps of 2000
                    const tickVals = [];
                    for (let v = min; v <= max; v += 2000) tickVals.push(v);
                    axisGen = d3.axisLeft(scale).tickValues(tickVals);
                }
                // numeric scales: reduce tick count (fallback)
                else if (scale && scale.ticks) {
                    axisGen = d3.axisLeft(scale).ticks(halfTickCount);
                } else {
                    // point scales (categorical): show approximately half the labels
                    const vals = scale.domain ? scale.domain() : [];
                    const tickVals = vals.filter((v, idx) => idx % 2 === 0);
                    axisGen = d3.axisLeft(scale).tickValues(tickVals);
                }
                d3.select(nodes[i]).call(axisGen);
            });

        // Add axis titles
        this.axes.append('text')
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .text(d => d)
            .style('fill', 'black');

        // Add brushes to each axis
        this.brushes = {};
        this.dimensions.forEach(dim => {
            this.brushes[dim] = d3.brushY()
                .extent([[-10, 0], [10, height]])
                .on('start brush end', (event) => this.brushed(event, dim));

            this.svg.append('g')
                .attr('class', `brush ${dim}`)
                .attr('transform', `translate(${this.x(dim)},0)`)
                .call(this.brushes[dim]);
        });

        this.drawLines();
    }

    drawLines() {
        const path = d => {
            // build points and guard against undefined/NaN y-values so each line spans full width
            const points = this.dimensions.map(dim => {
                let raw = d[dim];
                // if numeric scale but value is string, coerce
                if (this.y[dim] && this.y[dim].tickFormat && typeof raw === 'string' && !isNaN(+raw)) {
                    raw = +raw;
                }
                let yPos = this.y[dim](raw);
                if (yPos === undefined || yPos === null || isNaN(yPos)) {
                    // fallback to middle of axis to avoid path breaks
                    yPos = this.height / 2;
                }
                return [this.x(dim), yPos];
            });
            return d3.line()(points);
        };

        // Remove existing lines
        this.svg.selectAll('.data-line').remove();

    // Draw lines (use index as key so updates are stable)
        this.svg.selectAll('.data-line')
            .data(this.data, d => d.index)
            .join('path')
            .attr('class', 'data-line')
            .attr('d', path)
            .style('fill', 'none')
            .style('stroke', this.defaultColor)
            .style('opacity', 0.7)
            .on('mouseover', (event, d) => {
                // highlight on hover (blue) and show tooltip
                d3.select(event.currentTarget).raise().style('stroke', this.hoverColor).style('opacity', 1).style('stroke-width', 2);
                this.showTooltip(event, d);
            })
            .on('mousemove', (event, d) => this.moveTooltip(event, d))
            .on('mouseout', (event, d) => {
                // restore color based on selection
                const el = d3.select(event.currentTarget);
                const isSelected = this.selectedIds.has(d.index);
                                el.style('stroke', isSelected ? this.selectedColor : this.defaultColor)
                                    .style('opacity', isSelected ? 1 : 0.15)
                                    .style('stroke-width', isSelected ? `${this.selectedStrokeWidth}px` : null);
                this.hideTooltip();
            });
            
        // add click interaction: select the clicked line (single selection)
        this.svg.selectAll('.data-line')
            .on('click', (event, d) => {
                // prevent default event propagation
                event.stopPropagation();
                // set selected to only this index
                this.selectedIds = new Set([d.index]);
                // update visuals
                this.svg.selectAll('.data-line')
                    .style('stroke', p => this.selectedIds.has(p.index) ? this.selectedColor : this.defaultColor)
                    .style('opacity', p => this.selectedIds.has(p.index) ? 1 : 0.15)
                    .style('stroke-width', p => this.selectedIds.has(p.index) ? `${this.selectedStrokeWidth}px` : null);
                // call selection callback with the underlying data object
                if (this.onBrushEnd) {
                    this.onBrushEnd([d]);
                }
            });
    }

    brushed(event, dimension) {
        if (!event.selection) {
            // If brush is cleared
            if (this.onBrushEnd) {
                this.onBrushEnd([]);
            }
            // clear selection ids
            this.selectedIds = new Set();
            return;
        }

        const [y0, y1] = event.selection;
        
        // Filter data based on brush selection
        const selected = this.data.filter(d => {
            const y = this.y[dimension](d[dimension]);
            return y >= y0 && y <= y1;
        });

        // Update visual appearance (selected lines -> selectedColor)
        const defaultColor = this.defaultColor;
        const selectedIds = new Set(selected.map(d => d.index));
        this.selectedIds = selectedIds;

        this.svg.selectAll('.data-line')
            .style('stroke', d => selectedIds.has(d.index) ? this.selectedColor : defaultColor)
            .style('opacity', d => selectedIds.has(d.index) ? 1 : 0.15)
            .style('stroke-width', d => selectedIds.has(d.index) ? `${this.selectedStrokeWidth}px` : null);

        // Call callback with selected data
        if (this.onBrushEnd) {
            this.onBrushEnd(selected);
        }
    }

    updateHighlight(selectedData) {
        const defaultColor = this.defaultColor;
        if (!selectedData || selectedData.length === 0) {
            this.selectedIds = new Set();
            this.svg.selectAll('.data-line')
                .style('stroke', defaultColor)
                .style('opacity', 0.7)
                .style('stroke-width', null);
            return;
        }

        // Match by index to handle selections coming from other components
        const selectedIds = new Set(selectedData.map(d => d.index));
        this.selectedIds = selectedIds;
        this.svg.selectAll('.data-line')
            .style('stroke', d => selectedIds.has(d.index) ? this.selectedColor : defaultColor)
            .style('opacity', d => selectedIds.has(d.index) ? 1 : 0.15)
            .style('stroke-width', d => selectedIds.has(d.index) ? `${this.selectedStrokeWidth}px` : null);
    }

    setOnBrushEnd(callback) {
        this.onBrushEnd = callback;
    }

    showTooltip(event, d) {
        if (!this.tooltip) return;
        // build HTML with all dimension values
        const rows = this.dimensions.map(dim => {
            const val = d[dim] === undefined || d[dim] === null ? '' : d[dim];
            return `<div><strong>${dim}:</strong> ${val}</div>`;
        }).join('');
        const html = `<div><strong>index: ${d.index}</strong></div>${rows}`;
        this.tooltip.html(html).style('display', 'block');
        this.moveTooltip(event, d);
    }

    moveTooltip(event, d) {
        if (!this.tooltip) return;
        const containerRect = this.container.getBoundingClientRect();
        // position relative to container
        const offsetX = event.clientX - containerRect.left + 10;
        const offsetY = event.clientY - containerRect.top + 10;
        this.tooltip.style('left', `${offsetX}px`).style('top', `${offsetY}px`);
    }

    hideTooltip() {
        if (!this.tooltip) return;
        this.tooltip.style('display', 'none');
    }
}

export default ParallelCoord;