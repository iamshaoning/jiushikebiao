/**
 * 虚拟滚动组件
 * 实现高效的虚拟列表渲染，只渲染可见区域的元素
 * 
 * @class VirtualList
 * @param {Object} options - 配置选项
 * @param {HTMLElement} options.container - 容器元素
 * @param {Array} options.items - 数据项数组
 * @param {number} options.itemHeight - 每个项的高度
 * @param {Function} options.renderItem - 渲染函数
 * @exports VirtualList
 */
class VirtualList {
    constructor(options) {
        this.container = options.container;
        this.items = options.items;
        this.itemHeight = options.itemHeight;
        this.renderItem = options.renderItem;
        this.state = {
            scrollTop: 0,
            visibleItems: [],
            startIndex: 0
        };
        this.init();
    }
    
    init() {
        this.container.style.overflow = 'auto';
        this.container.style.position = 'relative';
        this.container.style.height = this.container.style.height || '400px';
        
        this.content = document.createElement('div');
        this.content.style.position = 'relative';
        this.container.appendChild(this.content);
        
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        this.update();
    }
    
    handleScroll(e) {
        this.state.scrollTop = e.target.scrollTop;
        this.update();
    }
    
    calculateVisibleItems() {
        const containerHeight = this.container.clientHeight;
        const startIndex = Math.floor(this.state.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(containerHeight / this.itemHeight) + 1,
            this.items.length
        );
        
        this.state.visibleItems = this.items.slice(startIndex, endIndex);
        this.state.startIndex = startIndex;
    }
    
    update() {
        this.calculateVisibleItems();
        
        const totalHeight = this.items.length * this.itemHeight;
        this.content.style.height = `${totalHeight}px`;
        
        this.content.innerHTML = '';
        
        this.state.visibleItems.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.style.position = 'absolute';
            itemElement.style.top = `${(this.state.startIndex + index) * this.itemHeight}px`;
            itemElement.style.height = `${this.itemHeight}px`;
            itemElement.style.width = '100%';
            itemElement.innerHTML = this.renderItem(item);
            this.content.appendChild(itemElement);
        });
    }
    
    setItems(items) {
        this.items = items;
        this.update();
    }
}

export { VirtualList };
export default VirtualList;