import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "CMC Wiki",
  description: "In-depth guide on UE5's CMC",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { 
        text: 'Docs',
        items: []
      },
      { 
        text: 'Guides',
        items: [
          { text: 'Custom Network Data', link: '/Guides/CustomNetworkData/introduction'}
        ]
      }
    ],

    sidebar: [
      {
        text: 'Guides',
        items: [
          { 
            text: 'Custom Network Data',
            collapsed: true,
            items: [ 
              { text: 'Introduction', link: '/Guides/CustomNetworkData/introduction' },
              { text: 'What and Why?', 
                collapsed: true,
                items: [
                  { text: 'What is it?', link: '/Guides/CustomNetworkData/WhatAndWhy/what' },
                  { text: 'Why use it?', link: '/Guides/CustomNetworkData/WhatAndWhy/why' }
                ]
              },
              { text: 'Client Move Data', 
                collapsed: true,
                items: [
                  { text: 'Default Pipeline', link: '/Guides/CustomNetworkData/ClientMoveData/defaultPipeline' },
                  { text: 'Adding Custom Data', link: '/Guides/CustomNetworkData/ClientMoveData/addingCustomData' }
                ]
              }
            ]
          }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Blueleafmonkey/CMC-Wiki' }
    ]
  },
  base: '/CMC-Wiki/'
})
