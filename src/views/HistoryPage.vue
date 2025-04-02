<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>历史记录</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">历史记录</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- 日期选择器 -->
      <ion-item>
        <ion-label>选择日期</ion-label>
        <ion-datetime
          presentation="date" 
          v-model="selectedDate"
          :max="maxDate"
          locale="zh-CN"
          @ionChange="loadRecordsForDate"
        ></ion-datetime>
      </ion-item>

      <!-- 总计统计 -->
      <div class="stats-container" v-if="dayRecords.length > 0">
        <div class="stats-card">
          <div class="stats-value">{{ formatDuration(totalDuration) }}</div>
          <div class="stats-label">总计时间</div>
        </div>
        <div class="stats-card">
          <div class="stats-value">{{ dayRecords.length }}</div>
          <div class="stats-label">记录数量</div>
        </div>
      </div>

      <!-- 记录列表 -->
      <ion-list v-if="dayRecords.length > 0">
        <ion-list-header>
          <ion-label>{{ formattedSelectedDate }}的记录</ion-label>
        </ion-list-header>
        
        <ion-item-sliding v-for="(record, index) in dayRecords" :key="index">
          <ion-item button @click="showRecordDetail(record)">
            <ion-label>
              <h2>{{ record.title || '未命名' }}</h2>
              <p>{{ formatTime(record.startTime) }} - {{ formatTime(record.endTime) }}</p>
            </ion-label>
          </ion-item>
          
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="confirmDeleteRecord(record.id)">
              删除
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
      
      <!-- 无记录时显示 -->
      <div class="no-records" v-else>
        <p>{{ formattedSelectedDate }}没有记录</p>
      </div>
    </ion-content>

    <!-- 记录详情模态框 -->
    <ion-modal :is-open="showModal" @didDismiss="closeModal">
      <ion-header>
        <ion-toolbar>
          <ion-title>记录详情</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeModal">关闭</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding" v-if="selectedRecord">
        <ion-item>
          <ion-label position="stacked">标题</ion-label>
          <ion-input v-model="selectedRecord.title" placeholder="未命名"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label>开始时间</ion-label>
          <ion-note slot="end">{{ formatDateTime(selectedRecord.startTime) }}</ion-note>
        </ion-item>

        <ion-item>
          <ion-label>结束时间</ion-label>
          <ion-note slot="end">{{ formatDateTime(selectedRecord.endTime) }}</ion-note>
        </ion-item>

        <ion-item>
          <ion-label>持续时间</ion-label>
          <ion-note slot="end">{{ formatDuration(selectedRecord.duration) }}</ion-note>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">备注</ion-label>
          <ion-textarea v-model="selectedRecord.note" placeholder="添加备注..."></ion-textarea>
        </ion-item>

        <div class="ion-padding">
          <ion-button expand="block" @click="saveRecordChanges">保存更改</ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch } from 'vue';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonListHeader,
  IonItemSliding,
  IonItemOption,
  IonItemOptions,
  IonDatetime,
  IonModal,
  IonButtons,
  IonButton,
  IonNote,
  IonInput,
  IonTextarea,
  alertController
} from '@ionic/vue';
import { Preferences } from '@capacitor/preferences';
import { eventBus, EventType, lastModifiedDate } from '../stores/events';

// 定义记录类型
interface TimeRecord {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  note: string;
}

// 状态管理
const selectedDate = ref(new Date().toISOString());
const dayRecords = ref<TimeRecord[]>([]);
const maxDate = new Date().toISOString();
const showModal = ref(false);
const selectedRecord = ref<TimeRecord | null>(null);
const isLoading = ref(false);

// 计算属性
const formattedSelectedDate = computed(() => {
  const date = new Date(selectedDate.value);
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
});

const totalDuration = computed(() => {
  return dayRecords.value.reduce((sum, record) => sum + record.duration, 0);
});

// 辅助函数：补零
function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

// 格式化日期作为存储键
function getDateKey(date: Date): string {
  return `records_${date.getFullYear()}_${padZero(date.getMonth() + 1)}_${padZero(date.getDate())}`;
}

// 格式化时间 (不带秒)
function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 格式化日期时间 (带秒)
function formatDateTime(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// 格式化持续时间
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// 加载指定日期的记录
async function loadRecordsForDate() {
  if (isLoading.value) return;
  
  isLoading.value = true;
  const date = new Date(selectedDate.value);
  const key = getDateKey(date);
  
  try {
    const { value } = await Preferences.get({ key });
    
    if (value) {
      try {
        const records = JSON.parse(value);
        dayRecords.value = records.map((record: any) => ({
          ...record,
          title: record.title || '',
          startTime: new Date(record.startTime),
          endTime: new Date(record.endTime)
        }));
      } catch (e) {
        console.error('Error parsing records:', e);
        dayRecords.value = [];
      }
    } else {
      dayRecords.value = [];
    }
  } catch (error) {
    console.error('Error loading records:', error);
    dayRecords.value = [];
  } finally {
    isLoading.value = false;
  }
}

// 确认删除记录
async function confirmDeleteRecord(id: string) {
  const alert = await alertController.create({
    header: '确认删除',
    message: '确定要删除这条记录吗？',
    buttons: [
      {
        text: '取消',
        role: 'cancel'
      },
      {
        text: '删除',
        role: 'destructive',
        handler: () => {
          deleteRecord(id);
        }
      }
    ]
  });

  await alert.present();
}

// 删除记录
async function deleteRecord(id: string) {
  // 找到当前记录的索引
  const index = dayRecords.value.findIndex(record => record.id === id);
  if (index === -1) return;
  
  // 从数组中移除
  const newRecords = [...dayRecords.value];
  newRecords.splice(index, 1);
  dayRecords.value = newRecords;
  
  // 保存到存储
  const date = new Date(selectedDate.value);
  const key = getDateKey(date);
  
  try {
    await Preferences.set({
      key,
      value: JSON.stringify(newRecords)
    });
    
    // 记录最后修改的日期
    lastModifiedDate.value = date.toISOString().split('T')[0];
    
    // 发送记录删除事件
    eventBus.emit(EventType.RECORD_DELETED, { date: key });
  } catch (error) {
    console.error('Error saving records:', error);
    // 如果保存失败，还原记录列表
    await loadRecordsForDate();
  }
}

// 显示记录详情
function showRecordDetail(record: TimeRecord) {
  selectedRecord.value = {...record}; // 创建副本避免直接修改
  showModal.value = true;
}

// 关闭模态框
function closeModal() {
  showModal.value = false;
  selectedRecord.value = null;
}

// 保存记录更改
async function saveRecordChanges() {
  if (!selectedRecord.value) return;
  
  const date = new Date(selectedDate.value);
  const key = getDateKey(date);
  const updatedRecords = dayRecords.value.map(record => 
    record.id === selectedRecord.value?.id ? selectedRecord.value : record
  );
  
  try {
    await Preferences.set({
      key,
      value: JSON.stringify(updatedRecords)
    });
    dayRecords.value = updatedRecords;
    
    // 记录最后修改的日期
    lastModifiedDate.value = date.toISOString().split('T')[0];
    
    // 发送记录更新事件
    eventBus.emit(EventType.RECORD_UPDATED, { date: key });
    
    closeModal();
  } catch (error) {
    console.error('Error saving record changes:', error);
    // 显示错误提示
    const alert = await alertController.create({
      header: '保存失败',
      message: '保存记录更改时出错，请重试',
      buttons: ['确定']
    });
    await alert.present();
  }
}

// 组件挂载时加载今日记录并设置事件监听
onMounted(() => {
  loadRecordsForDate();
  
  // 设置定期刷新数据（每分钟刷新一次）
  const refreshInterval = setInterval(() => {
    if (new Date(selectedDate.value).toDateString() === new Date().toDateString()) {
      loadRecordsForDate();
    }
  }, 60000);
  
  // 监听事件总线上的记录变化
  const handleRecordChange = (data: { date: string }) => {
    // 只在当前选中的日期与变更日期相同时刷新
    const currentDateKey = getDateKey(new Date(selectedDate.value));
    if (data.date === currentDateKey) {
      loadRecordsForDate();
    }
  };
  
  // 监听所有相关事件
  eventBus.on(EventType.RECORD_ADDED, handleRecordChange);
  eventBus.on(EventType.RECORD_UPDATED, handleRecordChange);
  eventBus.on(EventType.RECORD_DELETED, handleRecordChange);
  eventBus.on(EventType.ALL_RECORDS_CLEARED, () => loadRecordsForDate());
  
  // 创建一个清理函数，用于在页面卸载前清理资源
  const cleanup = () => {
    clearInterval(refreshInterval);
    eventBus.off(EventType.RECORD_ADDED, handleRecordChange);
    eventBus.off(EventType.RECORD_UPDATED, handleRecordChange);
    eventBus.off(EventType.RECORD_DELETED, handleRecordChange);
    eventBus.off(EventType.ALL_RECORDS_CLEARED, () => loadRecordsForDate());
  };
  
  // 添加窗口卸载事件监听器
  window.addEventListener('beforeunload', cleanup);
  
  // 通过Vue的生命周期钩子来处理组件卸载清理
  onActivated(() => {
    loadRecordsForDate();
  });

  // 在组件挂载时添加日期变化监听
  // 监听选择日期变化
  watch(selectedDate, () => {
    loadRecordsForDate();
  });
});
</script>

<style scoped>
.stats-container {
  display: flex;
  justify-content: space-around;
  margin: 1.5rem 0;
}

.stats-card {
  text-align: center;
  padding: 1rem;
  background-color: var(--ion-color-light);
  border-radius: 8px;
  min-width: 40%;
}

.stats-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--ion-color-primary);
}

.stats-label {
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

.no-records {
  text-align: center;
  margin-top: 2rem;
  color: var(--ion-color-medium);
}
</style> 