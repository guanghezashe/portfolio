import { useState } from "react";

const detailCards = [
  ["角色", "三维动态 / 导演", "重点", "商业项目对接 / 前期策划 / 制作落地", "产出", "项目方案、动态影像与商业视觉交付"],
  ["角色", "三维动态设计师", "重点", "产品建模 / 场景渲染 / 动态影像", "产出", "卖点视觉、效果图与产品动画全流程"],
  ["角色", "三维设计师", "重点", "创意构思 / 模型制作 / 材质灯光", "产出", "产品效果图与相关特效视觉"],
  ["角色", "电商设计组长", "重点", "品牌规范 / 页面创意 / 团队协作", "产出", "电商页面、大促视觉与设计文件库"],
  ["角色", "平面 / 电商视觉设计师", "重点", "KV / 包装 / UI / 商品视觉", "产出", "活动首页、推广图与产品展示内容"],
];

export default function ExperienceList({ items }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  return <div className="career-accordion">
    <div className="career-rail"><span>CAREER VERSIONS</span><span>2016 — NOW / 10 YEARS</span></div>
    <div className="career-cards">{items.map(([year, company, combinedRole], index) => {
      const [position, ...descriptionParts] = combinedRole.split(" · ");
      const description = descriptionParts.join(" · ");
      const detail = detailCards[index];
      const isActive = activeIndex === index;
      return <article className={`career-card ${isActive ? "is-active" : ""}`} key={year} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(-1)}>
        <button className="career-card-trigger" type="button" aria-expanded={isActive} onClick={() => setActiveIndex(isActive ? -1 : index)}>
          <span className="career-version">{String(index + 1).padStart(2, "0")} / V{items.length - index}.0</span>
          <span className="career-main"><time>{year}</time><strong>{position}</strong><em>{company}</em></span>
          <span className="career-toggle" aria-hidden="true">{isActive ? "−" : "+"}</span>
        </button>
        <div className="career-expand" aria-hidden={!isActive}><div><p>{description}</p><div className="career-details"><div><small>{detail[0]}</small><span>{detail[1]}</span></div><div><small>{detail[2]}</small><span>{detail[3]}</span></div><div><small>{detail[4]}</small><span>{detail[5]}</span></div></div></div></div>
      </article>;
    })}</div>
  </div>;
}
