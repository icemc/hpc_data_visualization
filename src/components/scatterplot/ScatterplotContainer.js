import './Scatterplot.css'
import { useEffect, useRef, useState } from 'react';
import ScatterplotD3 from './Scatterplot-d3';

function ScatterplotContainer({ scatterplotData, xAttribute, yAttribute, selectedItems, scatterplotControllerMethods }) {
    const containerRef = useRef(null);
    const visualizationRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

    useEffect(() => {
        // Initialize the visualization
        if (!visualizationRef.current) {
            visualizationRef.current = new ScatterplotD3(
                containerRef.current,
                scatterplotControllerMethods.updateSelectedItems
            );
        }

        const viz = visualizationRef.current;
        viz.initialize(dimensions.width, dimensions.height);
        
        if (scatterplotData && scatterplotData.length > 0) {
            // Ensure numerical values
            const processedData = scatterplotData.map(d => ({
                ...d,
                area: +d.area,
                price: +d.price,
                id: d.id || Math.random().toString(36).substr(2, 9)
            }));
            viz.update(processedData, xAttribute, yAttribute);
        }

        return () => {
            if (visualizationRef.current) {
                visualizationRef.current.clear();
            }
        };
    }, [scatterplotData, dimensions, xAttribute, yAttribute, scatterplotControllerMethods]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="scatterplot-container" style={{ width: '100%', height: '600px' }}>
            <svg
                ref={containerRef}
                width="100%"
                height="100%"
                className="scatterplot"
            />
        </div>
    );
}

export default ScatterplotContainer;