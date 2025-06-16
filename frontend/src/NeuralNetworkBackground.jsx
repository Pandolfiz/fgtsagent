import React, { useRef, useEffect } from 'react';

const NODES_PER_LAYER = [4, 6, 4]; // Reduzido de [5, 8, 5] para [4, 6, 4]
const LAYERS = NODES_PER_LAYER.length;
const NODE_RADIUS = 10; // Reduzido de 13 para 10
const COLORS = ['#00fff7', '#00bcd4', '#2196f3'];

function useWindowSize() {
  const [size, setSize] = React.useState({ width: window.innerWidth, height: window.innerHeight });
  
  React.useEffect(() => {
    function onResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  
  return size;
}

export default function NeuralNetworkBackground() {
  const animRef = useRef(0);
  const { width, height } = useWindowSize();
  const [nodes, setNodes] = React.useState([]);

  // Funções para calcular posição dos nós
  function getNodeX(layer) {
    return ((layer + 1) * width) / (LAYERS + 1);
  }
  
  function getNodeY(layer, i) {
    const nodes = NODES_PER_LAYER[layer];
    return ((i + 1) * height) / (nodes + 1);
  }

  // Inicializa e atualiza os nós ao redimensionar
  useEffect(() => {
    const initial = [];
    for (let l = 0; l < LAYERS; l++) {
      for (let i = 0; i < NODES_PER_LAYER[l]; i++) {
        initial.push({
          layer: l,
          idx: i,
          baseX: getNodeX(l),
          baseY: getNodeY(l, i),
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    setNodes(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // Animação simples
  useEffect(() => {
    let running = true;
    
    function animate() {
      if (!running) return;
      
      setNodes(prev => prev.map((node) => {
        const t = Date.now() / 2000 + node.phase; // Animação mais lenta
        const offset = Math.sin(t) * 5; // Amplitude reduzida
        const offsetY = Math.cos(t * 0.7) * 3; // Amplitude reduzida
        
        return {
          ...node,
          x: node.baseX + offset,
          y: node.baseY + offsetY,
        };
      }));
      
      if (running) {
        animRef.current = requestAnimationFrame(animate);
      }
    }
    
    animRef.current = requestAnimationFrame(animate);
    
    return () => { 
      running = false; 
      cancelAnimationFrame(animRef.current); 
    };
  }, []);

  // Agrupa nós por camada
  const layers = Array.from({ length: LAYERS }, (_, l) =>
    nodes.filter(n => n.layer === l)
  );

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      zIndex: -10, 
      pointerEvents: 'none', 
      overflow: 'hidden'
    }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        style={{ display: 'block' }}
      >
        {/* Linhas */}
        {layers.slice(0, -1).map((layer, l) =>
          layer.map((from, i) =>
            layers[l + 1].map((to, j) => (
              <line
                key={`l${l}-${i}-${j}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={COLORS[(l + i + j) % COLORS.length]}
                strokeWidth={1.5}
                opacity={0.2}
              />
            ))
          )
        )}
        {/* Nós */}
        {nodes.map((node, idx) => (
          <circle
            key={idx}
            cx={node.x}
            cy={node.y}
            r={NODE_RADIUS}
            fill={COLORS[node.layer % COLORS.length]}
            opacity={0.7}
          />
        ))}

      </svg>
    </div>
  );
} 