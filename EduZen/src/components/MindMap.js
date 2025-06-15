import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Typography, CircularProgress, Paper, Tooltip, IconButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

// Custom node components
function MainConceptNode({ data }) {
  return (
    <Paper
      elevation={3}
      sx={{
        padding: '10px 20px',
        borderRadius: '8px',
        backgroundColor: 'rgba(234, 67, 53, 0.1)',
        border: '2px solid #EA4335',
        width: 'auto',
        minWidth: '180px',
        maxWidth: '250px',
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold" color="#EA4335">
        {data.label}
      </Typography>
    </Paper>
  );
}

function SubConceptNode({ data }) {
  return (
    <Paper
      elevation={2}
      sx={{
        padding: '8px 16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(66, 133, 244, 0.1)',
        border: '1px solid #4285F4',
        width: 'auto',
        minWidth: '150px',
        maxWidth: '220px',
      }}
    >
      <Typography variant="body1" color="#4285F4">
        {data.label}
      </Typography>
    </Paper>
  );
}

function DetailNode({ data }) {
  return (
    <Paper
      elevation={1}
      sx={{
        padding: '6px 12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(52, 168, 83, 0.1)',
        border: '1px solid #34A853',
        width: 'auto',
        minWidth: '120px',
        maxWidth: '200px',
      }}
    >
      <Typography variant="body2" color="#34A853">
        {data.label}
      </Typography>
    </Paper>
  );
}

// Node types - defined after the custom components
const nodeTypes = {
  mainConcept: MainConceptNode,
  subConcept: SubConceptNode,
  detail: DetailNode,
};

const MindMap = ({ content, width = '100%', height = '500px' }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const flowRef = useRef(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );
  
  // Handle node click
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    
    // Highlight connected edges
    setEdges(edges => 
      edges.map(edge => ({
        ...edge,
        style: {
          ...edge.style,
          stroke: (edge.source === node.id || edge.target === node.id) ? '#EA4335' : '#aaa',
          strokeWidth: (edge.source === node.id || edge.target === node.id) ? 2 : 1,
        },
      }))
    );
    
    // Highlight the selected node and connected nodes
    setNodes(nodes => 
      nodes.map(n => ({
        ...n,
        style: {
          ...n.style,
          boxShadow: n.id === node.id ? '0 0 10px 5px rgba(234, 67, 53, 0.5)' : 
                    edges.some(edge => (edge.source === node.id && edge.target === n.id) || 
                                      (edge.target === node.id && edge.source === n.id)) ? 
                    '0 0 8px 2px rgba(66, 133, 244, 0.4)' : 'none',
          zIndex: n.id === node.id ? 1000 : 1,
        },
      }))
    );
  }, [edges, setEdges, setNodes]);
  
  // Handle zoom in
  const zoomIn = useCallback(() => {
    if (flowRef.current) {
      flowRef.current.zoomIn();
    }
  }, []);
  
  // Handle zoom out
  const zoomOut = useCallback(() => {
    if (flowRef.current) {
      flowRef.current.zoomOut();
    }
  }, []);
  
  // Handle fit view (reset)
  const resetView = useCallback(() => {
    if (flowRef.current) {
      flowRef.current.fitView();
      
      // Reset edge styles
      setEdges(edges => 
        edges.map(edge => ({
          ...edge,
          style: {
            ...edge.style,
            stroke: '#aaa',
            strokeWidth: 1,
          },
        }))
      );
      
      // Reset node styles
      setNodes(nodes => 
        nodes.map(n => ({
          ...n,
          style: {
            ...n.style,
            boxShadow: 'none',
            zIndex: 1,
          },
        }))
      );
      
      setSelectedNode(null);
    }
  }, [setEdges, setNodes]);
  
  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Generate mind map from content - run immediately without async delay
  useEffect(() => {
    if (!content) {
      setLoading(false);
      return;
    }

    try {
      // Parse content to extract concepts - do this synchronously
      const concepts = extractConcepts(content);
      
      // Generate nodes and edges - also synchronously
      const { nodes, edges } = generateGraphData(concepts);
      
      // Update state immediately
      setNodes(nodes);
      setEdges(edges);
      setLoading(false);
    } catch (err) {
      console.error('Error generating mind map:', err);
      setError('Failed to generate mind map. Please try again.');
      setLoading(false);
    }
  }, [content, setNodes, setEdges]);

  // Extract concepts from content
  const extractConcepts = (content) => {
    // Simple extraction logic - in a real app, this would be more sophisticated
    // and potentially use NLP or AI to extract concepts
    const lines = content.split('\n');
    const mainConcepts = [];
    let currentMain = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Check if this is a main concept (e.g., all caps or ends with :)
      if (trimmedLine === trimmedLine.toUpperCase() || trimmedLine.endsWith(':')) {
        currentMain = {
          title: trimmedLine.replace(/:$/, ''),
          subConcepts: []
        };
        mainConcepts.push(currentMain);
      } 
      // If it starts with a bullet or number, it's a sub-concept
      else if (currentMain && (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || /^\d+\./.test(trimmedLine))) {
        const subTitle = trimmedLine.replace(/^[•\-\d\.]+\s*/, '');
        currentMain.subConcepts.push({
          title: subTitle,
          details: []
        });
      } 
      // Otherwise, it's a detail of the last sub-concept
      else if (currentMain && currentMain.subConcepts.length > 0) {
        const lastSub = currentMain.subConcepts[currentMain.subConcepts.length - 1];
        lastSub.details.push(trimmedLine);
      }
      // If we don't have a main concept yet, create one
      else if (!currentMain) {
        currentMain = {
          title: "Main Topic",
          subConcepts: [{
            title: trimmedLine,
            details: []
          }]
        };
        mainConcepts.push(currentMain);
      }
    }
    
    return mainConcepts;
  };

  // Generate graph data from concepts
  const generateGraphData = (concepts) => {
    const nodes = [];
    const edges = [];
    let nodeId = 0;
    
    // Create central node
    const centralNode = {
      id: `node-${nodeId}`,
      type: 'mainConcept',
      data: { label: 'Central Topic' },
      position: { x: 0, y: 0 },
      style: { width: 'auto' }
    };
    nodes.push(centralNode);
    nodeId++;
    
    // Calculate positions for main concepts in a circle around the central node
    const radius = 250;
    const mainConceptCount = concepts.length;
    
    concepts.forEach((concept, index) => {
      // Calculate position in a circle
      const angle = (index / mainConceptCount) * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      
      // Create main concept node
      const mainNodeId = `node-${nodeId}`;
      nodes.push({
        id: mainNodeId,
        type: 'mainConcept',
        data: { label: concept.title },
        position: { x, y },
        style: { width: 'auto' }
      });
      
      // Connect to central node
      edges.push({
        id: `edge-central-${nodeId}`,
        source: centralNode.id,
        target: mainNodeId,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed }
      });
      
      nodeId++;
      
      // Calculate positions for sub-concepts
      const subRadius = 150;
      const subConceptCount = concept.subConcepts.length;
      
      concept.subConcepts.forEach((subConcept, subIndex) => {
        // Calculate position in a semi-circle
        const subAngle = angle - Math.PI/4 + (subIndex / (subConceptCount - 1 || 1)) * Math.PI/2;
        const subX = x + subRadius * Math.cos(subAngle);
        const subY = y + subRadius * Math.sin(subAngle);
        
        // Create sub-concept node
        const subNodeId = `node-${nodeId}`;
        nodes.push({
          id: subNodeId,
          type: 'subConcept',
          data: { label: subConcept.title },
          position: { x: subX, y: subY },
          style: { width: 'auto' }
        });
        
        // Connect to main concept
        edges.push({
          id: `edge-main-${nodeId}`,
          source: mainNodeId,
          target: subNodeId,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed }
        });
        
        nodeId++;
        
        // Add details if any
        if (subConcept.details.length > 0) {
          // Combine details to avoid too many nodes
          const detailText = subConcept.details.join(' ');
          if (detailText.length > 0) {
            const detailX = subX + 120 * Math.cos(subAngle);
            const detailY = subY + 120 * Math.sin(subAngle);
            
            const detailNodeId = `node-${nodeId}`;
            nodes.push({
              id: detailNodeId,
              type: 'detail',
              data: { 
                label: detailText.length > 100 
                  ? detailText.substring(0, 97) + '...' 
                  : detailText 
              },
              position: { x: detailX, y: detailY },
              style: { width: 'auto' }
            });
            
            edges.push({
              id: `edge-sub-${nodeId}`,
              source: subNodeId,
              target: detailNodeId,
              animated: false,
              markerEnd: { type: MarkerType.ArrowClosed }
            });
            
            nodeId++;
          }
        }
      });
    });
    
    return { nodes, edges };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: height }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>Generating Mind Map...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: height }}>
        <Typography variant="h6" color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: isFullscreen ? '100vw' : width, 
      height: isFullscreen ? '100vh' : height, 
      border: '1px solid #eee', 
      borderRadius: '8px', 
      overflow: 'hidden',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto',
      backgroundColor: '#fff'
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        ref={flowRef}
        style={{ background: '#f9f9f9' }}
      >
        <Controls showInteractive={true} />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
        <Background variant="dots" gap={12} size={1} color="#aaa" />
        
        {/* Custom control panel */}
        <Panel position="top-right" style={{ background: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Zoom In">
              <IconButton onClick={zoomIn} size="small" sx={{ color: '#4285F4' }}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton onClick={zoomOut} size="small" sx={{ color: '#4285F4' }}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset View">
              <IconButton onClick={resetView} size="small" sx={{ color: '#4285F4' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <IconButton onClick={toggleFullscreen} size="small" sx={{ color: '#4285F4' }}>
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Panel>
        
        {/* Node information panel when a node is selected */}
        {selectedNode && (
          <Panel position="bottom-center" style={{ 
            background: 'white', 
            padding: '10px 15px', 
            borderRadius: '8px', 
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            maxWidth: '80%',
            textAlign: 'center'
          }}>
            <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold' }}>
              {selectedNode.data.label}
            </Typography>
            {selectedNode.type === 'detail' && (
              <Typography variant="body2" color="text.secondary">
                Click on connected nodes to explore relationships
              </Typography>
            )}
          </Panel>
        )}
      </ReactFlow>
    </Box>
  );
};

export default MindMap;
