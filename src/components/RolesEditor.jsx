import { useState } from "react";
import PerkSelector from "./PerkSelector";
import { perkImageSrc } from "../utils/perks";

const DIFFICULTIES = ["Fácil", "Media", "Difícil"];

// Editor visual de roles / versiones / perks.
// props:
//   roles: { [roleName]: { image, variants: [{ name, difficulty, perks: [{name,image}] }] } }
//   options: string[] (nombres de roles visibles en la ruleta, en orden)
//   onChange(nextRoles, nextOptions)
export default function RolesEditor({ roles = {}, options = [], onChange }) {
  const [newRoleName, setNewRoleName] = useState("");
  const [expandedRole, setExpandedRole] = useState(null);
  // Estado del selector de perks: { roleName, variantIndex } | null
  const [perkEditor, setPerkEditor] = useState(null);

  // Lista de roles a mostrar: primero los que están en options (respetando su
  // orden), y luego cualquier rol que exista en `roles` pero no esté en options
  // (para no ocultar roles huérfanos).
  const roleNames = [
    ...options,
    ...Object.keys(roles).filter((name) => !options.includes(name)),
  ];

  function commit(nextRoles, nextOptions = options) {
    onChange(nextRoles, nextOptions);
  }

  function addRole() {
    const name = newRoleName.trim();
    if (!name) return;
    if (roles[name]) {
      setNewRoleName("");
      setExpandedRole(name);
      return;
    }
    const nextRoles = {
      ...roles,
      [name]: { image: null, variants: [] },
    };
    const nextOptions = options.includes(name) ? options : [...options, name];
    setNewRoleName("");
    setExpandedRole(name);
    commit(nextRoles, nextOptions);
  }

  function removeRole(name) {
    const nextRoles = { ...roles };
    delete nextRoles[name];
    const nextOptions = options.filter((o) => o !== name);
    if (expandedRole === name) setExpandedRole(null);
    commit(nextRoles, nextOptions);
  }

  function renameRole(oldName, rawNewName) {
    const newName = rawNewName.trim();
    if (!newName || newName === oldName || roles[newName]) return;
    const nextRoles = {};
    Object.entries(roles).forEach(([key, value]) => {
      nextRoles[key === oldName ? newName : key] = value;
    });
    const nextOptions = options.map((o) => (o === oldName ? newName : o));
    if (expandedRole === oldName) setExpandedRole(newName);
    commit(nextRoles, nextOptions);
  }

  function addVersion(roleName) {
    const role = roles[roleName];
    const nextNumber = role.variants.length + 1;
    const newVariant = {
      name: String(nextNumber),
      difficulty: "Media",
      perks: [],
    };
    const nextRoles = {
      ...roles,
      [roleName]: { ...role, variants: [...role.variants, newVariant] },
    };
    commit(nextRoles);
  }

  function removeVersion(roleName, index) {
    const role = roles[roleName];
    const nextVariants = role.variants.filter((_, i) => i !== index);
    const nextRoles = {
      ...roles,
      [roleName]: { ...role, variants: nextVariants },
    };
    commit(nextRoles);
  }

  function updateVersion(roleName, index, patch) {
    const role = roles[roleName];
    const nextVariants = role.variants.map((v, i) =>
      i === index ? { ...v, ...patch } : v
    );
    const nextRoles = {
      ...roles,
      [roleName]: { ...role, variants: nextVariants },
    };
    commit(nextRoles);
  }

  function confirmPerks(perks) {
    if (!perkEditor) return;
    updateVersion(perkEditor.roleName, perkEditor.variantIndex, { perks });
    setPerkEditor(null);
  }

  const currentEditorPerks =
    perkEditor && roles[perkEditor.roleName]
      ? roles[perkEditor.roleName].variants[perkEditor.variantIndex]?.perks || []
      : [];

  return (
    <div className="roles-editor">
      <h3>Roles y versiones</h3>

      <div className="roles-editor__add-role">
        <input
          type="text"
          placeholder="Nombre del nuevo rol"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRole()}
        />
        <button className="roles-editor__add-role-btn" onClick={addRole}>
          + Crear rol
        </button>
      </div>

      <div className="roles-editor__list">
        {roleNames.map((roleName) => {
          const role = roles[roleName] || { variants: [] };
          const isExpanded = expandedRole === roleName;
          return (
            <div key={roleName} className="roles-editor__role">
              <div className="roles-editor__role-head">
                <button
                  className="roles-editor__role-toggle"
                  onClick={() =>
                    setExpandedRole(isExpanded ? null : roleName)
                  }
                >
                  <span className="roles-editor__caret">
                    {isExpanded ? "▾" : "▸"}
                  </span>
                  {role.image && (
                    <img
                      className="roles-editor__role-img"
                      src={role.image}
                      alt={roleName}
                    />
                  )}
                  <span className="roles-editor__role-name">{roleName}</span>
                  <span className="roles-editor__role-count">
                    {role.variants.length} versión
                    {role.variants.length === 1 ? "" : "es"}
                  </span>
                </button>
                <button
                  className="roles-editor__role-delete"
                  onClick={() => removeRole(roleName)}
                  title="Eliminar rol"
                >
                  ✖
                </button>
              </div>

              {isExpanded && (
                <div className="roles-editor__role-body">
                  <label className="roles-editor__rename">
                    Nombre del rol
                    <input
                      type="text"
                      defaultValue={roleName}
                      onBlur={(e) => renameRole(roleName, e.target.value)}
                    />
                  </label>

                  {role.variants.map((variant, vIndex) => (
                    <div key={vIndex} className="roles-editor__variant">
                      <div className="roles-editor__variant-head">
                        <label>
                          Versión
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) =>
                              updateVersion(roleName, vIndex, {
                                name: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Dificultad
                          <select
                            value={variant.difficulty}
                            onChange={(e) =>
                              updateVersion(roleName, vIndex, {
                                difficulty: e.target.value,
                              })
                            }
                          >
                            {DIFFICULTIES.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="roles-editor__variant-delete"
                          onClick={() => removeVersion(roleName, vIndex)}
                          title="Eliminar versión"
                        >
                          ✖
                        </button>
                      </div>

                      <div className="roles-editor__perks">
                        {variant.perks.length === 0 ? (
                          <span className="roles-editor__perks-empty">
                            Sin perks
                          </span>
                        ) : (
                          variant.perks.map((perk) => (
                            <img
                              key={perk.image}
                              className="roles-editor__perk-icon"
                              src={perkImageSrc(perk.image)}
                              alt={perk.name}
                              title={perk.name}
                            />
                          ))
                        )}
                        <button
                          className="roles-editor__perks-edit"
                          onClick={() =>
                            setPerkEditor({ roleName, variantIndex: vIndex })
                          }
                        >
                          Editar perks
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    className="roles-editor__add-version"
                    onClick={() => addVersion(roleName)}
                  >
                    + Agregar versión
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {perkEditor && (
        <PerkSelector
          selectedPerks={currentEditorPerks}
          onConfirm={confirmPerks}
          onClose={() => setPerkEditor(null)}
        />
      )}
    </div>
  );
}
