---
layout: default
permalink: /en/blog/
title: "Blog"
author_profile: true
lang: en
blog_index: true
---

<div class="blog-index-header">
  <h1>Blog</h1>
  {% include blog-language-switch.html %}
</div>

<div class="blog-list" lang="en">
{% for entry in site.data.blog %}
  <article class="blog-list__entry">
    <h2><a href="{{ '/en/blog/' | append: entry.slug | append: '/' | relative_url }}">{{ entry.title_en | escape }}</a></h2>
    <p>{{ entry.description_en | escape }}</p>
  </article>
{% endfor %}
</div>
