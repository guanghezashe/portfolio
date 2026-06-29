const imageModules = import.meta.glob("./assets/gallery/**/*.{jpg,jpeg,png,webp,gif}", {
  eager: true,
  query: "?url",
  import: "default",
});

const videoModules = import.meta.glob("./assets/videos-web/**/*.{mp4,webm}", {
  eager: true,
  query: "?url",
  import: "default",
});

const modules = { ...imageModules, ...videoModules };

const categoryOrder = ["AIGC", "产品视频", "卖点动态", "场景渲染", "活动KV", "电商详情"];
const videoExtensions = new Set(["mp4", "mov", "webm"]);

const getMeta = (category) => {
  const meta = {
    AIGC: {
      projectTime: "2025 - 2026",
      background: "以产品为基础进行 AI 场景与氛围探索，服务概念验证和视觉方向延展。",
      tools: "ComfyUI / Midjourney / Photoshop",
    },
    产品视频: {
      projectTime: "2023 - 2026",
      background: "围绕运动服饰产品完成上市传播与内容发布的动态视觉制作。",
      tools: "C4D / Octane / After Effects",
    },
    卖点动态: {
      projectTime: "2023 - 2026",
      background: "将面料与功能卖点转译为易理解的动态视觉语言。",
      tools: "C4D / Octane / After Effects",
    },
    场景渲染: {
      projectTime: "2022 - 2026",
      background: "以真实空间、材质与光线建立产品的使用情境和质感表达。",
      tools: "C4D / Octane / Photoshop",
    },
    活动KV: {
      projectTime: "2021 - 2022",
      background: "面向品牌大促与节点营销，建立高识别度的活动主视觉。",
      tools: "Photoshop / Illustrator / After Effects",
    },
    电商详情: {
      projectTime: "2019 - 2022",
      background: "围绕产品信息层级与功能卖点，组织电商详情页的视觉表达。",
      tools: "Photoshop / C4D / Octane",
    },
  };
  return meta[category] || {};
};

const naturalSort = (a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true, sensitivity: "base" });

export const staticWorks = Object.entries(modules)
  .map(([path, url], index) => {
    const parts = path.split("/");
    const category = parts.at(-2) || "未分类";
    const filename = parts.at(-1) || `work-${index + 1}`;
    const extension = filename.split(".").pop().toLowerCase();
    const title = filename.replace(/\.[^.]+$/, "");
    const mediaType = videoExtensions.has(extension) ? "video" : "image";
    const meta = getMeta(category);

    return {
      id: `static-${index + 1}`,
      title,
      category,
      media: mediaType,
      mediaType,
      src: url,
      fileUrl: url,
      coverUrl: mediaType === "image" ? url : "",
      previewSrc: mediaType === "image" ? url : "",
      poster: undefined,
      projectTime: meta.projectTime || "",
      time: meta.projectTime || "",
      background: meta.background || "",
      description: meta.background || "",
      tools: meta.tools || "",
      tags: [],
      isFeatured: index < 60,
      sortOrder: index + 1,
    };
  })
  .sort((a, b) => {
    const categoryDelta = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (categoryDelta !== 0) return categoryDelta;
    return naturalSort(a.title, b.title);
  })
  .map((work, index) => ({ ...work, id: `static-${index + 1}`, sortOrder: index + 1, isFeatured: index < 60 }));

export const staticCategories = categoryOrder.filter((category) => staticWorks.some((work) => work.category === category));
