import { ref } from 'vue';

// 定义事件类型
export const enum EventType {
  RECORD_ADDED = 'record_added',
  RECORD_UPDATED = 'record_updated',
  RECORD_DELETED = 'record_deleted',
  ALL_RECORDS_CLEARED = 'all_records_cleared'
}

// 定义回调函数类型
type EventCallback = (...args: any[]) => void;

// 创建一个简单的事件总线
export const eventBus = {
  // 使用Map存储事件与回调函数的对应关系
  listeners: new Map<string, Set<EventCallback>>(),

  // 添加事件监听
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  },

  // 移除事件监听
  off(event: string, callback: EventCallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  },

  // 触发事件
  emit(event: string, ...args: any[]) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        callback(...args);
      });
    }
  }
};

// 最后修改日期的记录
export const lastModifiedDate = ref<string | null>(null); 