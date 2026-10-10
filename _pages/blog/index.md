---
layout: default
permalink: /blog/
title: "Blog"
author_profile: true
---

# Blog

<div class="blog-list" lang="zh-CN">
{% for entry in site.data.blog %}
  <article class="blog-list__entry">
    <h2><a href="{{ '/blog/' | append: entry.slug | append: '/' | relative_url }}">{{ entry.title | escape }}</a></h2>
    <p>{{ entry.description | escape }}</p>
    <a class="blog-list__pdf" href="{{ '/files/blog/' | append: entry.slug | append: '.pdf' | relative_url }}">PDF</a>
  </article>
{% endfor %}
</div>
