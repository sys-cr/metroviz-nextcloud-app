/** @type {import('@storybook/html-vite').StorybookConfig} */
export default {
    framework: '@storybook/html-vite',
    stories: ['../js/stories/**/*.stories.@(js|mjs)'],
    addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
    docs: { autodocs: false },
};
