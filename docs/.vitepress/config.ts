import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "CMC Wiki",
  description: "In-depth wiki for UE5's CMC",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
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
      { icon: 'github', link: 'https://github.com/OmniacDEV/CMC-Wiki' }
    ]
  },
  base: '/CMC-Wiki/'
})
