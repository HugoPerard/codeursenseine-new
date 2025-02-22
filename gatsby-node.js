const slugify = require(`slugify`);

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;

  // -------------------- CREATING MEETUPS PAGE ---------------------
  const meetups = await graphql(
    `
      query {
        allMdx(
          sort: { fields: frontmatter___meetup_date, order: DESC }
          filter: { frontmatter: { published: { ne: false } } }
        ) {
          nodes {
            id
            frontmatter {
              slug
              published
              meetup_date
            }
            parent {
              ... on File {
                name
                relativeDirectory
                sourceInstanceName
              }
            }
          }
        }
      }
    `
  );

  if (meetups.errors) {
    throw meetups.errors;
  }

  // Create meetup post pages.
  const meetupsNodes = meetups.data.allMdx.nodes;

  meetupsNodes.forEach((meetup) => {
    if (
      meetup.parent.sourceInstanceName === "meetups" &&
      meetup.frontmatter.meetup_date
    ) {
      createPage({
        path: `/meetups/events/${slugify(meetup.frontmatter.slug, {
          strict: true,
          lower: true,
        })}`,
        component: require.resolve(`./src/templates/meetup-post.js`),
        context: {
          id: meetup.id,
        },
      });
    }
  });

  const metadataQuery = await graphql(`
    query {
      site {
        siteMetadata {
          currentYear
          description
        }
      }
    }
  `);

  if (metadataQuery.errors) {
    throw metadataQuery.errors;
  }

  // -------------------------- CREATING ORGANISERS PAGE -----------------------
  const organisersQuery = await graphql(`
    query {
      allFile(
        filter: {
          sourceInstanceName: { eq: "organisers" }
          extension: { eq: "mdx" }
        }
        sort: { fields: childMdx___frontmatter___name }
      ) {
        nodes {
          childMdx {
            frontmatter {
              name
              image {
                publicURL
              }
              twitter
              github
              linkedin
            }
          }
        }
      }
    }
  `);

  if (organisersQuery.errors) {
    throw organisersQuery.errors;
  }

  createPage({
    path: `/${metadataQuery.data.site.siteMetadata.currentYear}/organisateurs`,
    component: require.resolve(`./src/templates/Organisers/index.js`),
    context: {
      organisers: organisersQuery.data.allFile.nodes,
      siteMetadata: metadataQuery.data.site.siteMetadata,
    },
  });

  // -------------------- CREATING SPONSORS PAGE ---------------------
  const sponsorsPageQuery = await graphql(`
    query {
      allMdx(
        filter: { frontmatter: { sponsor: { ne: "disabled" } } }
        sort: { order: ASC, fields: frontmatter___name }
      ) {
        nodes {
          frontmatter {
            name
            link
            logo {
              publicURL
            }
            sponsor
            isDonator
          }
          body
          excerpt(pruneLength: 1000)
        }
      }
    }
  `);

  if (sponsorsPageQuery.errors) {
    throw sponsorsPageQuery.errors;
  }

  createPage({
    path: `/${metadataQuery.data.site.siteMetadata.currentYear}/sponsors`,
    component: require.resolve(`./src/templates/SponsorsPage/index.js`),
    context: {
      siteMetadata: metadataQuery.data.site.siteMetadata,
      sponsors: sponsorsPageQuery.data.allMdx.nodes,
    },
  });

  // -------------------- CREATING DYNAMIC PAGES --------------------------
  const pagesQuery = await graphql(`
    {
      allFile(
        filter: {
          sourceInstanceName: { eq: "pages" }
          extension: { eq: "mdx" }
          childMdx: { frontmatter: { published: { ne: false } } }
        }
      ) {
        nodes {
          childMdx {
            id
            frontmatter {
              title
              navigation
              order
            }
            body
          }
          name
          relativeDirectory
        }
      }
    }
  `);

  if (pagesQuery.errors) {
    throw pagesQuery.errors;
  }

  pagesQuery.data.allFile.nodes.forEach((page) => {
    const pagePath =
      page.relativeDirectory === "ces"
        ? page.name === "index"
          ? `/${metadataQuery.data.site.siteMetadata.currentYear}`
          : `/${metadataQuery.data.site.siteMetadata.currentYear}/${page.name}`
        : page.name === "index"
        ? `/${page.relativeDirectory}`
        : `/${page.relativeDirectory}/${page.name}`;

    createPage({
      path: pagePath,
      component: require.resolve(`./src/templates/PageLayout.js`),
      context: {
        body: page.childMdx.body,
        title: page.childMdx.frontmatter.title,
        theme: page.relativeDirectory,
        pagePath,
      },
    });
  });

  return null;
};
