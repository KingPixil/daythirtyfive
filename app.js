/**
 * Provides methods used in manipulating the page
 */
function Controller()
{
    // Allow any amount of whitespace either side of the #’s
    // Don’t allow a match if we’re at the end of the line (i.e., there’s no actual text yet)
    var triggers =
    {
        h1: /^\s*#\s+(?!$)/,
        h2: /^\s*##\s+(?!$)/,
        h3: /^\s*###\s+(?!$)/,
        h4: /^\s*####\s+(?!$)/,
        h5: /^\s*#####\s+(?!$)/,
        h6: /^\s*######\s+(?!$)/,
        p:  /^\s*\.\s+(?!$)/
    };

    // Ensure we get an regular *element*; not a text node, and not the <body>
    this.getFocusElement = function()
    {
        var node = document.getSelection().focusNode;

        if (!node) return null;

        while (node.nodeType != Node.ELEMENT_NODE)
        {
            node = node.parentNode;
        }

        return (node.tagName === 'BODY') ? null : node;
    };

    this.testForTriggers = function()
    {
        var $element = this.getFocusElement();

        for (var tagName in triggers)
        {
            if (triggers[tagName].test($element.textContent))
            {
                var $newElement = this.substituteElement($element, tagName);
                this.removeTriggerText($newElement, tagName);
                this.fixWhitespace($newElement);
                this.selectElement($newElement);
                return;
            }
        }
    };

    this.testForDiv = function()
    {
        var focusNode = document.getSelection().focusNode;
        if (!focusNode) return;

        if (focusNode.parentNode.tagName === 'DIV')
        {
            var $element = this.substituteElement(focusNode.parentNode, 'p');
            this.selectElement($element);
        }
    };

    this.substituteElement = function($old, tagName)
    {
        var $new = document.createElement(tagName);
        $new.textContent = $old.textContent;
        $old.parentNode.replaceChild($new, $old);
        return $new;
    };

    this.removeTriggerText = function($element, tagName)
    {
        $element.textContent = $element.textContent.replace(triggers[tagName], '');
    };

    // When creating a heading, Firefox chokes on trailing whitespace unless we stick a <br> on the end
    this.fixWhitespace = function($element)
    {
        var pattern = /\s+$/;

        if (pattern.test($element.textContent))
        {
            $element.appendChild(document.createElement('br'));
        }
    };

    this.selectElement = function($element, collapseToStart)
    {
        var offset = collapseToStart ? 0 : 1; // Collapse to end by default
        document.getSelection().collapse($element, offset);
    };

}


/**
 * Binds debounced key handlers that detect Markdown, and convert it to HTML
 */
function Editor(controller)
{
    function debounce(f, delay)
    {
        var timer = null;
        return function()
        {
            var context = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function() { f.apply(context, args) }, delay);
        }
    }

    function addDebouncedListener(event, handler, delay)
    {
        delay = delay || 250;
        document.addEventListener(event, debounce(handler, delay));
    }

    this.init = function()
    {
        addDebouncedListener('keyup', controller.testForTriggers.bind(controller));
        addDebouncedListener('keyup', controller.testForDiv.bind(controller));
        document.designMode = 'on';
    };

    this.init();
}


/**
 * Prints out the (hidden) demo text contained in the HTML file
 */
function Demo(controller, runWhenDone)
{
    var msPerCharacter = 20, msPerPause = 1500;

    var $body, $elements, $hiddenElement, $activeElement;
    var characters = [];

    var getDemoText = function()
    {
        var nodeList = document.getElementsByClassName('demo-text');
        $elements = Array.prototype.slice.call(nodeList);
    };

    var nextLine = function()
    {
        $hiddenElement = $elements.shift();
        if ($hiddenElement)
        {
            $activeElement = document.createElement('p');
            $body.appendChild($activeElement);

            characters = $hiddenElement.textContent.split('');
            printCharacter();
        }
        else
        {
            runWhenDone.call();
        }
    };

    var printCharacter = function()
    {
        if (characters.length > 0)
        {
            var character = characters.shift();
            $activeElement.textContent = $activeElement.textContent.concat(character);

            setTimeout(function() { printCharacter() }, msPerCharacter);
        }
        else
        {
            // Pause after printing the heading text, then transform it into a real H1 element
            if ($hiddenElement.tagName === 'H1')
            {
                new BlinkingCursor().blinkForDuration(function()
                {
                    controller.selectElement($activeElement);
                    controller.testForTriggers();
                    nextLine();

                }, msPerPause, $activeElement);
            }
            else
            {
                nextLine();
            }
        }
    };

    var runDemo = function()
    {
        $body = document.getElementsByTagName('body')[0];
        getDemoText();
        nextLine();
    };

    runDemo();
}


function BlinkingCursor(controller)
{
    var $body, $p, $previousSibling, timeout;

    this.blinkForDuration = function(callback, duration, $target)
    {
        $previousSibling = $target;

        create();
        blink();

        setTimeout(function()
        {
            remove();
            callback.call()

        }, duration);
    };

    this.blinkUntilFocused = function()
    {
        if (document.hasFocus())
        {
            controller.selectElement($body.lastElementChild);
        }
        else
        {
            create();
            blink();
            $body.onfocus = removeOnFocus;
        }
    };

    function create()
    {
        $p = document.createElement('p');
        $p.classList.add('cursor');
        $p.innerHTML = '&nbsp;';
        $body.appendChild($p);

        if (!$previousSibling) $previousSibling = $p.previousElementSibling;
        $previousSibling.classList.add('before-cursor');
    }

    function blink()
    {
        $p.classList.toggle('visible');
        if (blink) timeout = setTimeout(function() { blink() }, 500);
    }

    function removeOnFocus()
    {
        remove();
        $body.onfocus = null;
        controller.selectElement($body.lastElementChild);
    }

    function remove()
    {
        clearTimeout(timeout);
        $body.removeChild($p);
        $previousSibling.classList.remove('before-cursor');
    }

    function init()
    {
        $body = document.getElementsByTagName('body')[0];
    }

    init();
}


document.addEventListener('DOMContentLoaded', function()
{
    var controller = new Controller();

    new Demo(controller, function()
    {
        new Editor(controller);
        new BlinkingCursor(controller).blinkUntilFocused();
    });
});
