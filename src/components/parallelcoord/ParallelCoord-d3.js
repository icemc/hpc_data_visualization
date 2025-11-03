import * as d3 from 'd3';

class ParallelCoord {
    constructor(container, data, dimensions) {
        this.container = container;
        this.data = data;
        this.dimensions = dimensions;
        this.margin = { top: 30, right: 50, bottom: 30, left: 50 };
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;
        
        this.init();
    }

    init() {
        const { width, height, margin } = this;

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

        // Add axes
        this.axes = this.svg.selectAll('.axis')
            .data(this.dimensions)
            .enter()
            .append('g')
            .attr('class', 'axis')
            .attr('transform', d => `translate(${this.x(d)},0)`)
            .each((d, i, nodes) => {
                d3.select(nodes[i]).call(d3.axisLeft(this.y[d]));
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
        const defaultColor = '#666'; // dark grey for unselected
        this.svg.selectAll('.data-line')
            .data(this.data, d => d.index)
            .join('path')
            .attr('class', 'data-line')
            .attr('d', path)
            .style('fill', 'none')
            .style('stroke', defaultColor)
            .style('opacity', 0.7);
    }

    brushed(event, dimension) {
        if (!event.selection) {
            // If brush is cleared
            if (this.onBrushEnd) {
                this.onBrushEnd([]);
            }
            return;
        }

        const [y0, y1] = event.selection;
        
        // Filter data based on brush selection
        const selected = this.data.filter(d => {
            const y = this.y[dimension](d[dimension]);
            return y >= y0 && y <= y1;
        });

        // Update visual appearance (selected lines -> green)
        const defaultColor = '#666';
        const selectedColor = '#2ca02c'; // green
        const selectedIds = new Set(selected.map(d => d.index));

        this.svg.selectAll('.data-line')
            .style('stroke', d => selectedIds.has(d.index) ? selectedColor : defaultColor)
            .style('opacity', d => selectedIds.has(d.index) ? 1 : 0.15);

        // Call callback with selected data
        if (this.onBrushEnd) {
            this.onBrushEnd(selected);
        }
    }

    updateHighlight(selectedData) {
        const defaultColor = '#666';
        const selectedColor = '#2ca02c';
        if (!selectedData || selectedData.length === 0) {
            this.svg.selectAll('.data-line')
                .style('stroke', defaultColor)
                .style('opacity', 0.7);
            return;
        }

        // Match by index to handle selections coming from other components
        const selectedIds = new Set(selectedData.map(d => d.index));
        this.svg.selectAll('.data-line')
            .style('stroke', d => selectedIds.has(d.index) ? selectedColor : defaultColor)
            .style('opacity', d => selectedIds.has(d.index) ? 1 : 0.15);
    }

    setOnBrushEnd(callback) {
        this.onBrushEnd = callback;
    }
}

export default ParallelCoord;