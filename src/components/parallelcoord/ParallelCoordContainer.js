import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import ParallelCoord from './ParallelCoord-d3';
import './ParallelCoord.css';

const ParallelCoordContainer = ({ data, onSelectionChange, selectedData }) => {
    const containerRef = useRef(null);
    const visRef = useRef(null);

    useEffect(() => {
        if (!data || data.length === 0) return;

        // Define dimensions to show in parallel coordinates
        const dimensions = [
            'price',
            'area',
            'bedrooms',
            'bathrooms',
            'stories',
            'parking'
        ];

        // Initialize visualization
        const vis = new ParallelCoord(containerRef.current, data, dimensions);
        visRef.current = vis;

        // Set up brush end callback
        vis.setOnBrushEnd((selected) => {
            if (onSelectionChange) {
                onSelectionChange(selected);
            }
        });

        // Cleanup
        return () => {
            containerRef.current.innerHTML = '';
        };
    }, [data]);

    // Update highlights when selection changes from other components
    useEffect(() => {
        if (visRef.current) {
            visRef.current.updateHighlight(selectedData);
        }
    }, [selectedData]);

    return (
        <div className="parallel-coord-container" ref={containerRef}></div>
    );
};

export default ParallelCoordContainer;