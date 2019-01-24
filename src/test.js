import parse from "./index";

let template = `
    <div id="id" class="class">
      <ul>
        asdasdasd
        <br>
        <input type="text" autofocus />
        <li>
          <!-- 你注意点！ -->
          </br>
        </li>
      </ul>
    </div>
`

let click = document.getElementById('click')
let container = document.getElementsByClassName('container')[0]
let root = parse(template.trim())
click.onclick = () => {
  container.appendChild(root.render())
}
