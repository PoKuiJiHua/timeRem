<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="timer" href="/tabs/timer">
          <ion-icon :icon="timerOutline"></ion-icon>
          <ion-label>计时器</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="history" href="/tabs/history">
          <ion-icon :icon="listOutline"></ion-icon>
          <ion-label>历史记录</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="settings" href="/tabs/settings">
          <ion-icon :icon="settingsOutline"></ion-icon>
          <ion-label>设置</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { 
  IonPage, 
  IonTabs,
  IonTabBar, 
  IonTabButton, 
  IonIcon, 
  IonLabel,
  IonRouterOutlet
} from '@ionic/vue';
import { timerOutline, listOutline, settingsOutline } from 'ionicons/icons';
</script>

<style scoped>
ion-tab-bar {
  --background: var(--ion-color-light);
}

ion-tab-button {
  --color-selected: var(--ion-color-primary);
}
</style>
