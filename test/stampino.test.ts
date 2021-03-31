import { fixture, expect, html } from '@open-wc/testing';

import type { RenderOptions } from '../src/stampino';
import { render, prepareTemplate } from '../src/stampino';

/**
 * @element stampino-test-element
 */
class StampinoTestElement<Model = any> extends HTMLElement {
  static is = 'stampino-test-element';

  declare renderOptions: RenderOptions;

  #model: Model;
  get model(): Model { return this.#model; }
  set model(model: Model) {
    this.#model = model;
    this.render();
  }

  /**
   * Template element to render. A light-DOM child of the element.
   */
  get template(): HTMLTemplateElement | null {
    return this.querySelector('template');
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this.template)
      this.render();
  }

  /**
   * Call to render the element's template using the model.
   * Rendering is synchronous and incremental.
   *
   * @summary Render the element's template with its model.
   */
  public render(): void {
    const { template, shadowRoot, model, renderOptions } = this;
    render(template, shadowRoot, model, renderOptions);
  }

  /** `querySelector` within the render root. */
  public $<E extends Element = Element>(selector: string): E | null

  public $<K extends keyof SVGElementTagNameMap>(selector: K): SVGElementTagNameMap[K] | null;

  public $<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null {
    return this.shadowRoot.querySelector(selector);
  }

  /** `querySelectorAll` within the render root. */

  public $$<E extends Element = Element>(selector: string): NodeListOf<E>;

  public $$<K extends keyof SVGElementTagNameMap>(selector: K): NodeListOf<SVGElementTagNameMap[K]>;

  public $$<K extends keyof HTMLElementTagNameMap>(
    selector: K
  ): NodeListOf<HTMLElementTagNameMap[K]> {
    return this.shadowRoot.querySelectorAll(selector);
  }
}

customElements.define(StampinoTestElement.is, StampinoTestElement);

function trimmedShadowTextContent(element: HTMLElement): string {
  return element.shadowRoot.textContent.replace(/\s+/mg, ' ').trim();
}

describe('stampino', function() {
  describe('given a template with static content', function() {
    let element: StampinoTestElement;
    beforeEach(async function() {
      element = await fixture(html`
        <stampino-test-element>
          <template>
            <p>This template has only static content</p>
          </template>
        </stampino-test-element>
      `);
      element.render();
    });
    it('renders the content', function() {
      expect(element.$$('p').length, 'p').to.equal(1);
      expect(trimmedShadowTextContent(element), 'textContent').to.equal(
        'This template has only static content'
      )
    });
  });

  describe('given a template with an expression referencing a model member', function() {
    let element: StampinoTestElement;
    beforeEach(async function() {
      // NB: double escape the source because this is a javascript string, not HTML
      element = await fixture(html`
        <stampino-test-element .model="${{ foo: 'this is foo' }}">
          <template>
            <div><code>\\{{ foo }}</code>: <span>{{ foo }}</span></div>
          </template>
        </stampino-test-element>
      `);
    });
    it('renders the expression\'s value', function() {
      expect(trimmedShadowTextContent(element), 'textContent').to.equal(
        '{{ foo }}: this is foo'
      );
    });
    describe('then updating the model', function() {
      beforeEach(function() {
        element.model = { foo: 'foo is new' };
      });
      it('rerenders', function() {
        expect(trimmedShadowTextContent(element), 'textContent').to.equal(
          '{{ foo }}: foo is new'
        );
      });
    });
  })

  describe('given a template with an arithmetical expression', function() {
    let element: StampinoTestElement;
    beforeEach(async function() {
      // NB: double escape the source because this is a javascript string, not HTML
      element = await fixture(html`
        <stampino-test-element .model="${{ x: 9 }}">
          <template>
            <p><code>\\{{ x * x - 1 }}</code>: <span>{{ x * x - 1 }}</span></p>
            <p>(where x = <span>{{ x }}</span>)</p>
          </template>
        </stampino-test-element>
      `);
    });
    it('renders the evaluated expression', function() {
      expect(trimmedShadowTextContent(element), 'textContent').to.equal(
        '{{ x * x - 1 }}: 80 (where x = 9)'
      )
    });
  })

  describe('given a template with nested conditional templates', function() {
    let element: StampinoTestElement;
    beforeEach(async function() {
      element = await fixture(html`
        <stampino-test-element>
          <template>
            <template type="if" if="{{true}}">
              <p>This renders (the other case doesn't)</p>
            </template>
            <template type="if" if="{{false}}">
              <p>This does not</p>
            </template>
          </template>
        </stampino-test-element>
      `);
    });
    it('renders the evaluated expression', function() {
      expect(trimmedShadowTextContent(element), 'textContent').to.equal(
        'This renders (the other case doesn\'t)'
      )
    });
  })

  describe('given a template with a nested repeating template', function() {
    let element: StampinoTestElement;
    beforeEach(async function() {
      element = await fixture(html`
        <stampino-test-element .model="${{ items: ['a', 'b', 'c'] }}">
          <template>
            <template type="repeat" repeat="{{items}}">
              <p>{{item}}</p>
            </template>
          </template>
        </stampino-test-element>
      `);
    });
    it('renders the list in the model', function() {
      expect(trimmedShadowTextContent(element), 'textContent').to.equal(
        'a b c'
      )
    });
  });

  describe('given a template with nullable model access', function() {
    let element: StampinoTestElement;
    beforeEach(async function() {
      element = await fixture(html`
        <stampino-test-element .model="${{ nullable: null }}">
          <template>
            <div><code>\\{{nullable.missing.property || 'none'}}</code>: <span>{{nullable.missing.property || 'none'}}</span></div>
          </template>
        </stampino-test-element>
      `);
    });
    it('renders the list in the model', function() {
      expect(trimmedShadowTextContent(element), 'textContent').to.equal(
        '{{nullable.missing.property || \'none\'}}: none'
      )
    });
  });

  describe('given a parent template which defines blocks named A and B', function() {
    let element: StampinoTestElement;
    beforeEach(async function() {
      element = await fixture(html`
        <stampino-test-element>
          <template id="parent">
            <div>
              <template name="A">This is default content for block A</template>
            </div>
            <div>
              <template name="B">This is default content for block B</template>
            </div>
          </template>
        </stampino-test-element>
      `);
    });
    it('renders the list in the model', function() {
      expect(trimmedShadowTextContent(element), 'textContent').to.equal([
        'This is default content for block A',
        'This is default content for block B'
      ].join(' '))
    });
  });

  describe('given a parent template which defines blocks named A and B', function() {
    let element: StampinoTestElement;
    let parent: HTMLTemplateElement;

    beforeEach(function() {
      parent = document.createElement('template');
      parent.id = 'parent';
      parent.innerHTML = `
        <div>
          <template name="A">This is default content for block A</template>
        </div>
        <div>
          <template name="B">This is default content for block B</template>
        </div>
      `;
      document.body.appendChild(parent);
    });

    afterEach(function() {
      parent.remove();
    });

    beforeEach(async function() {
      element = await fixture(html`
        <stampino-test-element .renderOptions="${{ extends: parent }}">
          <template>
            <template name="B">This is child content for block B</template>
          </template>
        </stampino-test-element>
      `);
    });

    it('renders the composed template', function() {
      expect(trimmedShadowTextContent(element), 'textContent').to.equal([
        'This is default content for block A',
        'This is child content for block B'
      ].join(' '))
    });
  });

  describe('given a parent template which defines blocks named A and B and an explicit super template', function() {
    let element: StampinoTestElement;
    let parent: HTMLTemplateElement;

    beforeEach(function() {
      parent = document.createElement('template');
      parent.id = 'parent';
      parent.innerHTML = `
        <div>
          <template name="A">This is default content for block A</template>
        </div>
        <div>
          <template name="B">This is default content for block B</template>
        </div>
      `;
      document.body.appendChild(parent);
    });

    afterEach(function() {
      parent.remove();
    });

    beforeEach(async function() {
      element = await fixture(html`
        <stampino-test-element .renderOptions="${{ extends: parent }}">
          <template>
            <div>before super template</div>
              <template name="super">
                <template name="B">This is child content for block B</template>
              </template>
            <div>after super template</div>
          </template>
        </stampino-test-element>
      `);
    });

    it('renders the composed template', function() {
      expect(trimmedShadowTextContent(element), 'textContent').to.equal([
        'before super template',
        'This is default content for block A',
        'This is child content for block B',
        'after super template',
      ].join(' '))
    });
  });

})
