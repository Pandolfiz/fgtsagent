import React, { useRef, useEffect } from 'react';

const NODES_PER_LAYER = [5, 8, 5]; // input, hidden, output
const LAYERS = NODES_PER_LAYER.length;
const NODE_RADIUS = 13;
const COLORS = ['#00fff7', '#00bcd4', '#2196f3', '#3f51b5'];

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

function getNodeX(layer, width) {
  return ((layer + 1) * width) / (LAYERS + 1);
}

function getNodeY(layer, i, height) {
  const nodes = NODES_PER_LAYER[layer];
  return ((i + 1) * height) / (nodes + 1);
}

export default function NeuralNetworkBackground() {
  const animRef = useRef(0);
  const { width, height } = useWindowSize();
  const [nodes, setNodes] = React.useState([]);
  const [mouse, setMouse] = React.useState({ x: null, y: null });

  // Funções para calcular posição dos nós com base no tamanho da tela
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

  // Atualiza a posição do mouse
  useEffect(() => {
    function handleMove(e) {
      setMouse({ x: e.clientX, y: e.clientY });
    }
    function handleLeave() {
      setMouse({ x: null, y: null });
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  // Animação dos nós
  useEffect(() => {
    let running = true;
    function animate() {
      setNodes(prev => prev.map((node, idx, arr) => {
        const t = Date.now() / 900 + node.phase;
        const offset = Math.sin(t) * 12;
        const offsetY = Math.cos(t * 0.7) * 8;
        let x = node.baseX + offset;
        let y = node.baseY + offsetY;

        // Repulsão do mouse
        if (mouse.x !== null && mouse.y !== null) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = 270; // distância de repulsão
          if (dist < minDist) {
            const force = (minDist - dist) / minDist; // força proporcional
            const angle = Math.atan2(dy, dx);
            x += Math.cos(angle) * force * 64;
            y += Math.sin(angle) * force * 64;
          }
        }

        // Repulsão entre nós
        let repulseX = 0;
        let repulseY = 0;
        const nodeRepulseRadius = 120;
        arr.forEach((other, j) => {
          if (j === idx) return;
          const dx = x - (other.x ?? other.baseX);
          const dy = y - (other.y ?? other.baseY);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nodeRepulseRadius && dist > 0.01) {
            const force = (nodeRepulseRadius - dist) / nodeRepulseRadius;
            const angle = Math.atan2(dy, dx);
            repulseX += Math.cos(angle) * force * 8; // força suave
            repulseY += Math.sin(angle) * force * 8;
          }
        });
        x += repulseX;
        y += repulseY;

        return {
          ...node,
          x,
          y,
        };
      }));
      if (running) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [mouse]);

  // Agrupa nós por camada
  const layers = Array.from({ length: LAYERS }, (_, l) =>
    nodes.filter(n => n.layer === l)
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', minWidth: '100vw', minHeight: '100vh', zIndex: -10, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
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
                strokeWidth={2.2}
                opacity={0.18}
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
            filter="url(#glow)"
          />
        ))}
        {/* Efeito glow */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
} 