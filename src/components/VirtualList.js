/**
 * 虚拟滚动列表组件
 *
 * @description 高性能虚拟滚动实现，仅渲染可视区域内的 DOM 节点，支持 100+ 项列表
 * @module VirtualList
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
        
        this._boundScrollHandler = this.handleScroll.bind(this);
        this.container.addEventListener('scroll', this._boundScrollHandler);
        this.update();
    }
    
    handleScroll(e) {
        if (this._rafId) return;
        this._rafId = requestAnimationFrame(() => {
            this._rafId = null;
            this.state.scrollTop = e.target.scrollTop;
            this.update();
        });
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
        if (!this.content) return;
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
        if (this.content) this.update();
    }
    
    destroy() {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        if (this._boundScrollHandler) {
            this.container.removeEventListener('scroll', this._boundScrollHandler);
            this._boundScrollHandler = null;
        }
        this.container.innerHTML = '';
        this.items = [];
        this.content = null;
    }
}

export { VirtualList };
export default VirtualList;