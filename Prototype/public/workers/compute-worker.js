/**
 * 计算Worker
 * 
 * 在后台线程中执行重计算任务
 */

// Worker消息处理
self.onmessage = function(e) {
  const { taskId, type, data } = e.data;

  try {
    let result;

    switch (type) {
      case 'layout':
        result = computeLayout(data);
        break;

      case 'recommendations':
        result = computeRecommendations(data);
        break;

      case 'search':
        result = performSearch(data);
        break;

      case 'sort':
        result = sortData(data);
        break;

      case 'filter':
        result = filterData(data);
        break;

      case 'aggregate':
        result = aggregateData(data);
        break;

      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    // 发送结果
    self.postMessage({ taskId, result });
  } catch (error) {
    // 发送错误
    self.postMessage({ taskId, error: error.message });
  }
};

/**
 * 计算布局
 */
function computeLayout({ nodes, connections, layoutType }) {
  switch (layoutType) {
    case 'force':
      return forceDirectedLayout(nodes, connections);
    
    case 'hierarchical':
      return hierarchicalLayout(nodes, connections);
    
    case 'circular':
      return circularLayout(nodes);
    
    case 'grid':
      return gridLayout(nodes);
    
    default:
      return nodes;
  }
}

/**
 * 力导向布局
 */
function forceDirectedLayout(nodes, connections) {
  const layoutedNodes = nodes.map(node => ({
    ...node,
    vx: 0,
    vy: 0,
  }));

  const k = 200; // 理想距离
  const iterations = Math.min(50, Math.max(20, 100 - nodes.length));
  const c = 0.15; // 冷却系数

  for (let iter = 0; iter < iterations; iter++) {
    const temperature = 1 - iter / iterations;

    // 计算斥力
    for (let i = 0; i < layoutedNodes.length; i++) {
      for (let j = i + 1; j < layoutedNodes.length; j++) {
        const node1 = layoutedNodes[i];
        const node2 = layoutedNodes[j];
        const dx = node2.position.x - node1.position.x;
        const dy = node2.position.y - node1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        if (distance < k * 3) {
          const force = (k * k) / distance;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          node1.vx -= fx;
          node1.vy -= fy;
          node2.vx += fx;
          node2.vy += fy;
        }
      }
    }

    // 计算引力
    connections.forEach(conn => {
      const node1 = layoutedNodes.find(n => n.id === conn.source);
      const node2 = layoutedNodes.find(n => n.id === conn.target);

      if (!node1 || !node2) return;

      const dx = node2.position.x - node1.position.x;
      const dy = node2.position.y - node1.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = (distance * distance) / k;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      node1.vx += fx;
      node1.vy += fy;
      node2.vx -= fx;
      node2.vy -= fy;
    });

    // 更新位置
    layoutedNodes.forEach(node => {
      node.position.x += node.vx * temperature * c;
      node.position.y += node.vy * temperature * c;
      node.vx = 0;
      node.vy = 0;
    });
  }

  return layoutedNodes;
}

/**
 * 层次布局
 */
function hierarchicalLayout(nodes, connections) {
  // 简化的层次布局实现
  const levels = new Map();
  const visited = new Set();

  // 找到根节点
  const roots = nodes.filter(node => 
    !connections.some(conn => conn.target === node.id)
  );

  // BFS分层
  const queue = roots.map(node => ({ node, level: 0 }));
  
  while (queue.length > 0) {
    const { node, level } = queue.shift();
    
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level).push(node);

    // 添加子节点
    connections
      .filter(conn => conn.source === node.id)
      .forEach(conn => {
        const childNode = nodes.find(n => n.id === conn.target);
        if (childNode && !visited.has(childNode.id)) {
          queue.push({ node: childNode, level: level + 1 });
        }
      });
  }

  // 布局节点
  const layoutedNodes = [];
  const levelHeight = 200;
  const nodeSpacing = 150;

  levels.forEach((levelNodes, level) => {
    const totalWidth = (levelNodes.length - 1) * nodeSpacing;
    const startX = -totalWidth / 2;

    levelNodes.forEach((node, index) => {
      layoutedNodes.push({
        ...node,
        position: {
          x: startX + index * nodeSpacing,
          y: level * levelHeight,
        },
      });
    });
  });

  return layoutedNodes;
}

/**
 * 圆形布局
 */
function circularLayout(nodes) {
  const radius = Math.max(300, nodes.length * 30);
  const angleStep = (2 * Math.PI) / nodes.length;

  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: Math.cos(index * angleStep) * radius,
      y: Math.sin(index * angleStep) * radius,
    },
  }));
}

/**
 * 网格布局
 */
function gridLayout(nodes) {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const cellSize = 200;

  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: (index % cols) * cellSize,
      y: Math.floor(index / cols) * cellSize,
    },
  }));
}

/**
 * 计算推荐
 */
function computeRecommendations({ state, caseData }) {
  const recommendations = [];

  // 简化的推荐逻辑
  if (state.nodes.length < 5) {
    recommendations.push({
      type: 'node',
      priority: 'high',
      title: '添加更多节点',
      description: '建议添加更多节点以完善案件关系图',
    });
  }

  if (state.connections.length < state.nodes.length - 1) {
    recommendations.push({
      type: 'connection',
      priority: 'medium',
      title: '添加节点连接',
      description: '建议添加节点之间的连接关系',
    });
  }

  return recommendations;
}

/**
 * 执行搜索
 */
function performSearch({ nodes, query }) {
  const lowerQuery = query.toLowerCase();
  
  return nodes
    .map(node => {
      let score = 0;

      // 名称匹配
      if (node.data.name && node.data.name.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }

      // 描述匹配
      if (node.data.description && node.data.description.toLowerCase().includes(lowerQuery)) {
        score += 5;
      }

      // 标签匹配
      if (node.data.tags && node.data.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        score += 7;
      }

      return { node, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => result.node);
}

/**
 * 排序数据
 */
function sortData({ items, key, order }) {
  return items.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
}

/**
 * 过滤数据
 */
function filterData({ items, predicate }) {
  return items.filter(item => {
    // 简单的谓词评估
    return Object.entries(predicate).every(([key, value]) => {
      return item[key] === value;
    });
  });
}

/**
 * 聚合数据
 */
function aggregateData({ items, groupBy, aggregations }) {
  const groups = new Map();

  // 分组
  items.forEach(item => {
    const key = item[groupBy];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  // 聚合
  const results = [];
  groups.forEach((groupItems, key) => {
    const result = { [groupBy]: key };

    aggregations.forEach(({ field, operation }) => {
      const values = groupItems.map(item => item[field]);

      switch (operation) {
        case 'sum':
          result[`${field}_sum`] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result[`${field}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          result[`${field}_min`] = Math.min(...values);
          break;
        case 'max':
          result[`${field}_max`] = Math.max(...values);
          break;
        case 'count':
          result[`${field}_count`] = values.length;
          break;
      }
    });

    results.push(result);
  });

  return results;
}

