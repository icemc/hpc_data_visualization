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
            return d3.line()(this.dimensions.map(dim => [this.x(dim), this.y[dim](d[dim])]));
        };

        // Remove existing lines
        this.svg.selectAll('.data-line').remove();

        // Draw lines
        this.svg.selectAll('.data-line')
            .data(this.data)
            .join('path')
            .attr('class', 'data-line')
            .attr('d', path)
            .style('fill', 'none')
            .style('stroke', '#69b3a2')
            .style('opacity', 0.5);
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

        // Update visual appearance
        this.svg.selectAll('.data-line')
            .style('stroke', d => selected.includes(d) ? '#ff7f0e' : '#69b3a2')
            .style('opacity', d => selected.includes(d) ? 1 : 0.2);

        // Call callback with selected data
        if (this.onBrushEnd) {
            this.onBrushEnd(selected);
        }
    }

    updateHighlight(selectedData) {
        if (!selectedData || selectedData.length === 0) {
            this.svg.selectAll('.data-line')
                .style('stroke', '#69b3a2')
                .style('opacity', 0.5);
            return;
        }

        this.svg.selectAll('.data-line')
            .style('stroke', d => selectedData.includes(d) ? '#ff7f0e' : '#69b3a2')
            .style('opacity', d => selectedData.includes(d) ? 1 : 0.2);
    }

    setOnBrushEnd(callback) {
        this.onBrushEnd = callback;
    }
}

export default ParallelCoord;