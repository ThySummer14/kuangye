<script setup>
import { ref, watch } from 'vue';
import LifetimeChallenges from './LifetimeChallenges.vue';
import ContractChallenges from './ContractChallenges.vue';
import '../challenger.css';
const props=defineProps({initialCollection:{type:String,default:'lifetime'}});
const emit=defineEmits(['complete','abandon','toast','back']);
const collection=ref(props.initialCollection);
watch(()=>props.initialCollection,value=>{collection.value=value;});
</script>
<template>
  <div class="challenger-collections">
    <nav class="album-switch" aria-label="选择挑战专辑">
      <button :aria-pressed="collection==='lifetime'" @click="collection='lifetime'">人生挑战 <small>14</small></button>
      <button :aria-pressed="collection==='contract'" @click="collection='contract'">加码行动 <small>06</small></button>
    </nav>
    <component :is="collection==='lifetime'?LifetimeChallenges:ContractChallenges" @complete="emit('complete',$event)" @abandon="emit('abandon',$event)" @toast="emit('toast',$event)" @back="emit('back')"/>
  </div>
</template>
<style scoped>
.album-switch{display:flex;gap:6px;margin:0 0 16px}.album-switch button{font-family:inherit;font-size:12px;padding:12px 18px;min-height:44px;border:1px solid #728066;background:transparent;color:var(--ink);cursor:pointer}.album-switch button[aria-pressed=true]{background:#253027;color:#ffcc99;border-color:#8d7658}.album-switch small{font:10px monospace;margin-left:14px;opacity:.7}
</style>
