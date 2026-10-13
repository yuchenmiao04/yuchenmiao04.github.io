---
layout: default
permalink: /blog/
title: "Blog"
author_profile: true
lang: zh-CN
blog_index: true
---

<div class="blog-index-header">
  <h1>Blog</h1>
  {% include blog-language-switch.html %}
</div>

<div class="blog-list" lang="zh-CN">
{% for entry in site.data.blog %}
  <article class="blog-list__entry">
    <h2><a href="{{ '/blog/' | append: entry.slug | append: '/' | relative_url }}">{{ entry.title | escape }}</a></h2>
    <p>{{ entry.description | escape }}</p>
  </article>
{% endfor %}
</div>
