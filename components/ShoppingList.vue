<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildMergedItems,
  exportGroupedAsText,
  exportMergedAsText,
  groupShoppingItems,
} from "@/lib/export";

import { Textarea } from "./ui/textarea";

/**
 * 同步执行 execCommand('copy')，保留用户手势上下文。
 * 返回 true 表示复制成功。
 */
const execCommandCopy = (text: string): boolean => {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  ta.setAttribute("readonly", "");
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
};

export interface ShoppingItem {
  ingredientId: string;
  ingredientName: string;
  quantity?: string;
  unit?: string;
  note?: string;
  recipeName: string;
}

const props = withDefaults(
  defineProps<{
    items: ShoppingItem[];
    title?: string;
  }>(),
  { title: undefined },
);

const { t } = useI18n();
const showMerged = ref(true);

const fallbackText = ref("");
const fallbackDialogOpen = ref(false);
const fallbackTextareaRef = ref<InstanceType<typeof Textarea>>();

const showFallbackDialog = (text: string) => {
  fallbackText.value = text;
  fallbackDialogOpen.value = true;
};

watch(fallbackDialogOpen, async (open) => {
  if (open) {
    await nextTick();
    const el = fallbackTextareaRef.value?.$el as
      | HTMLTextAreaElement
      | undefined;
    el?.focus();
    el?.select();
  } else {
    fallbackText.value = "";
  }
});

const isSingleRecipe = computed(() => {
  if (props.items.length === 0) return true;
  const first = props.items[0]!.recipeName;
  return props.items.every((item) => item.recipeName === first);
});

const amountDisplay = (a: { quantity?: string; unit?: string }) =>
  a.quantity || a.unit ? `${a.quantity ?? ""} ${a.unit ?? ""}` : "-";

const groupedItems = computed(() => groupShoppingItems(props.items));
const mergedItems = computed(() => buildMergedItems(groupedItems.value));

const handleCopyText = () => {
  const titleStr = props.title || t("采购表");
  const text = showMerged.value
    ? exportMergedAsText(mergedItems.value, titleStr, isSingleRecipe.value)
    : exportGroupedAsText(groupedItems.value, titleStr, isSingleRecipe.value);

  // 安全上下文：使用 Clipboard API
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).then(
      () => toast(t("已复制到剪贴板")),
      () => showFallbackDialog(text),
    );
    return;
  }

  // 非安全上下文：同步 execCommand 保留用户手势
  if (execCommandCopy(text)) {
    toast(t("已复制到剪贴板"));
    return;
  }

  // 两种方式都失败：弹出手动复制对话框
  showFallbackDialog(text);
};
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold">
        {{ title || t("采购表") }}
      </h3>
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          :class="showMerged ? 'bg-accent' : ''"
          @click="showMerged = !showMerged"
          v-if="!isSingleRecipe"
        >
          <span v-if="showMerged"> {{ t("分离") }}</span>
          <span v-else> {{ t("求和") }}</span>
        </Button>
        <Button variant="outline" size="sm" @click="handleCopyText">
          {{ t("复制") }}
        </Button>
      </div>
    </div>

    <ScrollArea class="h-[calc(80vh-10rem)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t("名称") }}</TableHead>
            <TableHead>{{ t("用量") }}</TableHead>
            <TableHead>{{ t("备注") }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- 合并视图：数值（同单位和备注）求和 -->
          <template v-if="showMerged">
            <TableRow
              v-for="item in mergedItems"
              :key="`${item.ingredientId}::${item.note ?? ''}`"
            >
              <TableCell>{{ item.ingredientName }}</TableCell>
              <TableCell>
                <div class="space-y-0.5">
                  <div v-for="(line, i) in item.lines" :key="i" class="text-sm">
                    {{ line.display }}
                    <span
                      v-if="!isSingleRecipe"
                      class="text-xs text-(--color-on-surface-muted)"
                    >
                      （{{ line.recipeNames.join(", ") }}）
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell class="text-sm text-(--color-on-surface-muted)">
                {{ item.note || "-" }}
              </TableCell>
            </TableRow>
          </template>
          <!-- 分离视图：同食材合并行，用量分开显示 -->
          <template v-else>
            <TableRow
              v-for="item in groupedItems"
              :key="`${item.ingredientId}::${item.note ?? ''}`"
            >
              <TableCell>{{ item.ingredientName }}</TableCell>
              <TableCell>
                <div class="space-y-0.5">
                  <div v-for="(a, i) in item.amounts" :key="i" class="text-sm">
                    {{ amountDisplay(a) }}
                    <span
                      v-if="!isSingleRecipe"
                      class="text-xs text-(--color-on-surface-muted)"
                    >
                      （{{ a.recipeName }}）
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell class="text-sm text-(--color-on-surface-muted)">
                {{ item.note || "-" }}
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>

    <Dialog v-model:open="fallbackDialogOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t("手动复制") }}</DialogTitle>
          <DialogDescription>
            {{ t("自动复制不可用，请手动复制以下内容") }}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea class="h-64 w-full rounded-md border">
          <Textarea
            ref="fallbackTextareaRef"
            readonly
            :default-value="fallbackText"
            class="min-h-full w-full resize-none border-0 shadow-none focus-visible:ring-0"
          />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  </div>
</template>
