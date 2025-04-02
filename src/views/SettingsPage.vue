<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>设置</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">设置</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-list>
        <ion-item>
          <ion-label>深色模式</ion-label>
          <ion-toggle v-model="darkMode" @ionChange="toggleDarkMode"></ion-toggle>
        </ion-item>

        <ion-item button @click="showClearDataAlert">
          <ion-icon :icon="trashOutline" slot="start" color="danger"></ion-icon>
          <ion-label>清除所有数据</ion-label>
        </ion-item>

        <ion-item>
          <ion-label>关于</ion-label>
          <ion-note slot="end">版本 1.0.0</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonIcon,
  IonNote,
  alertController
} from '@ionic/vue';
import { trashOutline } from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';
import { useRouter } from 'vue-router';
import { eventBus, EventType, lastModifiedDate } from '../stores/events';

// 状态
const darkMode = ref(false);
const router = useRouter();

// 初始化
onMounted(async () => {
  // 检查深色模式设置
  const { value } = await Preferences.get({ key: 'darkMode' });
  if (value === 'true') {
    darkMode.value = true;
    document.documentElement.classList.add('dark');
  }
});

// 切换深色模式
async function toggleDarkMode() {
  if (darkMode.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  await Preferences.set({
    key: 'darkMode',
    value: darkMode.value.toString()
  });
}

// 显示清除数据确认
async function showClearDataAlert() {
  const alert = await alertController.create({
    header: '确认清除',
    message: '确定要清除所有记录数据吗？此操作不可恢复！',
    buttons: [
      {
        text: '取消',
        role: 'cancel'
      },
      {
        text: '清除',
        role: 'destructive',
        handler: () => {
          clearAllData();
        }
      }
    ]
  });

  await alert.present();
}

// 清除所有数据
async function clearAllData() {
  const keys = await Preferences.keys();
  
  for (const key of keys.keys) {
    // 只清除记录数据
    if (key.startsWith('records_')) {
      await Preferences.remove({ key });
    }
  }
  
  // 更新最后修改日期
  lastModifiedDate.value = new Date().toISOString().split('T')[0];
  
  // 发送清除所有记录事件
  eventBus.emit(EventType.ALL_RECORDS_CLEARED);
  
  // 显示成功消息
  const alert = await alertController.create({
    header: '操作成功',
    message: '所有记录数据已清除',
    buttons: [{
      text: '确定',
      handler: () => {
        // 刷新所有页面数据
        router.go(0);
      }
    }]
  });
  
  await alert.present();
}
</script>

<style scoped>
ion-item {
  --padding-start: 0;
}
</style> 