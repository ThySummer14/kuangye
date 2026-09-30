<script setup>
import SituationFieldNotes from './SituationFieldNotes.vue';
import { LIFE_NOTEBOOK } from '../data/life-tasks.js';
defineEmits(['inspect']);
</script>
<template><SituationFieldNotes :notebook="LIFE_NOTEBOOK" @inspect="$emit('inspect',$event)" /></template>
