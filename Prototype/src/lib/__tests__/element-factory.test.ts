/**
 * ElementFactory单元测试
 */

import { describe, it, expect } from 'vitest';
import { ElementFactory } from '../element-factory';

describe('ElementFactory', () => {
  describe('createFrame', () => {
    it('应该创建合法的Frame元素', () => {
      const frame = ElementFactory.createFrame(
        { x: 100, y: 100 },
        { width: 400, height: 300 },
        '测试框架'
      );

      expect(frame.type).toBe('frame');
      expect(frame.name).toBe('测试框架');
      expect(frame.position).toEqual({ x: 100, y: 100 });
      expect(frame.size).toEqual({ width: 400, height: 300 });
      expect(frame.children).toEqual([]);
      expect(frame.id).toMatch(/^frame-/);
      expect(frame.createdAt).toBeDefined();
      expect(frame.updatedAt).toBeDefined();
    });

    it('应该使用默认值', () => {
      const frame = ElementFactory.createFrame(
        { x: 0, y: 0 },
        { width: 100, height: 100 }
      );

      expect(frame.name).toBe('新框架'); // 实际默认值
      expect(frame.backgroundColor).toBe('#ffffff');
    });
  });

  describe('createGroup', () => {
    it('应该创建合法的Group元素', () => {
      const group = ElementFactory.createGroup(
        ['el1', 'el2'], // 实际签名：elementIds数组
        '测试分组'
      );

      expect(group.type).toBe('group');
      expect(group.name).toBe('测试分组');
      expect(group.children).toEqual(['el1', 'el2']);
      expect(group.id).toMatch(/^group-/);
    });
  });

  describe('createText', () => {
    it('应该创建合法的Text元素', () => {
      const text = ElementFactory.createText(
        { x: 10, y: 10 },
        '测试文本'
      );

      expect(text.type).toBe('text');
      expect(text.content).toBe('测试文本');
      expect(text.position).toEqual({ x: 10, y: 10 });
      expect(text.id).toMatch(/^text-/);
    });

    it('应该使用默认样式', () => {
      const text = ElementFactory.createText(
        { x: 0, y: 0 },
        '文本'
      );

      expect(text.fontSize).toBe(16);
      expect(text.fontFamily).toBe('Inter, sans-serif');
      expect(text.color).toBe('#1f2937'); // 实际默认值
    });
  });

  describe('createImage', () => {
    it('应该创建合法的Image元素', () => {
      const image = ElementFactory.createImage(
        { x: 20, y: 20 },
        'https://example.com/image.jpg' // 实际签名：src参数
      );

      expect(image.type).toBe('image');
      expect(image.src).toBe('https://example.com/image.jpg'); // 实际字段名：src
      expect(image.position).toEqual({ x: 20, y: 20 });
      expect(image.id).toMatch(/^image-/);
    });
  });

  describe('createShape', () => {
    it('应该创建合法的Shape元素', () => {
      const shape = ElementFactory.createShape(
        { x: 30, y: 30 },
        'circle' // 实际签名：shapeType参数
      );

      expect(shape.type).toBe('shape');
      expect(shape.shapeType).toBe('circle');
      expect(shape.position).toEqual({ x: 30, y: 30 });
      expect(shape.size).toEqual({ width: 100, height: 100 }); // circle的默认大小
      expect(shape.id).toMatch(/^shape-/);
    });

    it('应该使用默认样式', () => {
      const shape = ElementFactory.createShape(
        { x: 0, y: 0 },
        'rectangle'
      );

      expect(shape.fillColor).toBe('#f3f4f6'); // 实际字段名：fillColor
      expect(shape.strokeColor).toBe('#6b7280'); // 实际字段名和值
      expect(shape.strokeWidth).toBe(2);
    });
  });

  describe('createConnection', () => {
    it('应该创建合法的Connection元素', () => {
      const connection = ElementFactory.createConnection(
        'source-id',
        'target-id'
      );

      expect(connection.type).toBe('connection');
      expect(connection.sourceId).toBe('source-id'); // 实际字段名：sourceId
      expect(connection.targetId).toBe('target-id'); // 实际字段名：targetId
      expect(connection.id).toMatch(/^conn-/); // 实际ID前缀：conn
    });

    it('应该使用默认样式', () => {
      const connection = ElementFactory.createConnection(
        'source-id',
        'target-id'
      );

      expect(connection.lineType).toBe('bezier'); // 实际字段名：lineType，默认值：bezier
      expect(connection.strokeColor).toBe('#f97316'); // 实际字段名和值
      expect(connection.strokeWidth).toBe(2);
    });

    it('应该支持自定义样式', () => {
      const connection = ElementFactory.createConnection(
        'source-id',
        'target-id',
        { lineType: 'straight' } // 通过options参数自定义
      );

      expect(connection.lineType).toBe('straight');
    });
  });

  describe('ID生成', () => {
    it('应该生成唯一的ID', () => {
      const element1 = ElementFactory.createText({ x: 0, y: 0 }, '文本1');
      const element2 = ElementFactory.createText({ x: 0, y: 0 }, '文本2');

      expect(element1.id).not.toBe(element2.id);
    });

    it('ID应该包含类型前缀', () => {
      const frame = ElementFactory.createFrame({ x: 0, y: 0 }, { width: 100, height: 100 });
      const group = ElementFactory.createGroup(['el1'], 'group');
      const text = ElementFactory.createText({ x: 0, y: 0 }, '文本');

      expect(frame.id).toMatch(/^frame-/);
      expect(group.id).toMatch(/^group-/);
      expect(text.id).toMatch(/^text-/);
    });
  });

  describe('时间戳', () => {
    it('应该设置createdAt和updatedAt', () => {
      const element = ElementFactory.createText({ x: 0, y: 0 }, '文本');

      expect(element.createdAt).toBeDefined();
      expect(element.updatedAt).toBeDefined();
      expect(new Date(element.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
      expect(new Date(element.updatedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('createdAt和updatedAt应该相同（新创建的元素）', () => {
      const element = ElementFactory.createText({ x: 0, y: 0 }, '文本');

      expect(element.createdAt).toBe(element.updatedAt);
    });
  });

  describe('默认属性', () => {
    it('应该设置默认的opacity为1', () => {
      const element = ElementFactory.createText({ x: 0, y: 0 }, '文本');

      expect(element.opacity).toBe(1);
    });

    it('应该设置默认的visible为true', () => {
      const element = ElementFactory.createText({ x: 0, y: 0 }, '文本');

      expect(element.visible).toBe(true);
    });

    it('应该设置默认的locked为false', () => {
      const element = ElementFactory.createText({ x: 0, y: 0 }, '文本');

      expect(element.locked).toBe(false);
    });
  });
});

